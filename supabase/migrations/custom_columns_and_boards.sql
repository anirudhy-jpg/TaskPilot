-- Migration: Custom workflow columns and boards
-- This migration creates the columns table, modifies tasks to link to columns, backfills existing data, sets up RLS, and creates an atomic RPC deletion function.

-- 1. Create columns table
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Modify tasks table
-- Alter position column type to double precision
ALTER TABLE tasks ALTER COLUMN position TYPE double precision;

-- Add column_id column (initially nullable for backfilling)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES columns(id) ON DELETE CASCADE;

-- 3. Drop tasks.status check constraint dynamically to allow custom statuses
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint c
    join pg_attribute a on a.attnum = any(c.conkey)
    where c.conrelid = 'tasks'::regclass
      and a.attname = 'status'
      and c.contype = 'c'
  loop
    execute 'alter table tasks drop constraint ' || constraint_name;
  end loop;
end $$;

-- 4. Insert default columns for existing projects
INSERT INTO columns (board_id, name, position)
SELECT id, 'To Do', 1000.0 FROM projects
ON CONFLICT DO NOTHING;

INSERT INTO columns (board_id, name, position)
SELECT id, 'In Progress', 2000.0 FROM projects
ON CONFLICT DO NOTHING;

INSERT INTO columns (board_id, name, position)
SELECT id, 'Done', 3000.0 FROM projects
ON CONFLICT DO NOTHING;

-- 5. Backfill tasks: map tasks.status to columns
UPDATE tasks t
SET column_id = c.id
FROM columns c
WHERE c.board_id = t.project_id
  AND (
    (t.status = 'todo' AND c.name = 'To Do') OR
    (t.status = 'in_progress' AND c.name = 'In Progress') OR
    (t.status = 'done' AND c.name = 'Done')
  );

-- Assign any unmapped tasks to 'To Do' column as safety
UPDATE tasks t
SET column_id = (
  SELECT id FROM columns c
  WHERE c.board_id = t.project_id AND c.name = 'To Do'
  LIMIT 1
)
WHERE t.column_id IS NULL;

-- Convert existing positions to spaced double precision values
UPDATE tasks
SET position = position * 1000.0 + 1000.0;

-- 6. Set column_id as NOT NULL now that it is backfilled
ALTER TABLE tasks ALTER COLUMN column_id SET NOT NULL;

-- 7. Enable RLS on columns table
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view columns" ON columns FOR SELECT
TO authenticated USING (
  board_id IN (
    SELECT id FROM projects WHERE 
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR 
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
);

CREATE POLICY "Members can create columns" ON columns FOR INSERT
TO authenticated WITH CHECK (
  board_id IN (
    SELECT id FROM projects WHERE 
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR 
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
);

CREATE POLICY "Members can update columns" ON columns FOR UPDATE
TO authenticated USING (
  board_id IN (
    SELECT id FROM projects WHERE 
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR 
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
) WITH CHECK (
  board_id IN (
    SELECT id FROM projects WHERE 
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR 
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
);

CREATE POLICY "Members can delete columns" ON columns FOR DELETE
TO authenticated USING (
  board_id IN (
    SELECT id FROM projects WHERE 
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR 
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
);

-- 8. Enable Realtime for columns table
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'columns'
  ) then
    alter publication supabase_realtime add table columns;
  end if;
end $$;

-- 9. Create atomic column deletion and task transition function
CREATE OR REPLACE FUNCTION delete_column_and_handle_tasks(
  p_column_id UUID,
  p_action TEXT,
  p_target_column_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_max_pos DOUBLE PRECISION;
  v_rec RECORD;
  v_idx INT;
BEGIN
  -- Validate action
  IF p_action NOT IN ('move', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  IF p_action = 'move' THEN
    IF p_target_column_id IS NULL THEN
      RAISE EXCEPTION 'Target column ID must be provided when moving tasks';
    END IF;

    -- Get max position from target column
    SELECT COALESCE(MAX(position), 0.0) INTO v_max_pos
    FROM tasks
    WHERE column_id = p_target_column_id;

    -- Update tasks in source column: set target column_id and update position
    v_idx := 1;
    FOR v_rec IN 
      SELECT id FROM tasks 
      WHERE column_id = p_column_id 
      ORDER BY position ASC
    LOOP
      UPDATE tasks
      SET column_id = p_target_column_id,
          position = v_max_pos + (v_idx * 1000.0)
      WHERE id = v_rec.id;
      
      v_idx := v_idx + 1;
    END LOOP;
  ELSIF p_action = 'delete' THEN
    -- Delete tasks belonging to this column
    DELETE FROM tasks WHERE column_id = p_column_id;
  END IF;

  -- Delete the column itself
  DELETE FROM columns WHERE id = p_column_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
