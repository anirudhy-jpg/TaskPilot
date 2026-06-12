-- Migration: Add position column to tasks table for drag-and-drop ordering
-- Run this against your Supabase database

-- Add position column with a default of 0
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Backfill existing tasks: assign positions based on creation order within each status group
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY project_id, status
    ORDER BY created_at ASC
  ) - 1 AS new_position
  FROM tasks
)
UPDATE tasks
SET position = ranked.new_position
FROM ranked
WHERE tasks.id = ranked.id;

-- Create index for efficient position-based ordering per project+status
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_position
ON tasks (project_id, status, position);
