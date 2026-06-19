-- Create task type enum
DO $$ BEGIN
    CREATE TYPE task_type_enum AS ENUM ('task', 'feature', 'bug', 'enhancement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add type column to tasks table
ALTER TABLE tasks ADD COLUMN type task_type_enum NOT NULL DEFAULT 'task'::task_type_enum;

-- Update the log_task_activity trigger function to also log type changes
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activities (task_id, actor_id, action_type, new_value)
    VALUES (NEW.id, v_actor_id, 'TASK_CREATED', row_to_json(NEW)::jsonb);
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status / Column changed
    IF NEW.column_id IS DISTINCT FROM OLD.column_id THEN
      INSERT INTO public.task_activities (task_id, actor_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_actor_id, 'STATUS_CHANGED', jsonb_build_object('column_id', OLD.column_id), jsonb_build_object('column_id', NEW.column_id));
    END IF;

    -- Priority changed
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.task_activities (task_id, actor_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_actor_id, 'PRIORITY_CHANGED', jsonb_build_object('priority', OLD.priority), jsonb_build_object('priority', NEW.priority));
    END IF;
    
    -- Type changed
    IF NEW.type IS DISTINCT FROM OLD.type THEN
      INSERT INTO public.task_activities (task_id, actor_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_actor_id, 'TYPE_CHANGED', jsonb_build_object('type', OLD.type), jsonb_build_object('type', NEW.type));
    END IF;

    -- Assignee changed
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      IF OLD.assigned_to IS NULL THEN
        INSERT INTO public.task_activities (task_id, actor_id, action_type, new_value)
        VALUES (NEW.id, v_actor_id, 'ASSIGNEE_ADDED', jsonb_build_object('assigned_to', NEW.assigned_to));
      ELSIF NEW.assigned_to IS NULL THEN
        INSERT INTO public.task_activities (task_id, actor_id, action_type, old_value)
        VALUES (NEW.id, v_actor_id, 'ASSIGNEE_REMOVED', jsonb_build_object('assigned_to', OLD.assigned_to));
      ELSE
        INSERT INTO public.task_activities (task_id, actor_id, action_type, old_value, new_value)
        VALUES (NEW.id, v_actor_id, 'ASSIGNEE_ADDED', jsonb_build_object('assigned_to', OLD.assigned_to), jsonb_build_object('assigned_to', NEW.assigned_to));
      END IF;
    END IF;

    -- If title or description changed
    IF NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO public.task_activities (task_id, actor_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_actor_id, 'TASK_UPDATED', 
              jsonb_build_object('title', OLD.title, 'description', OLD.description), 
              jsonb_build_object('title', NEW.title, 'description', NEW.description));
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
