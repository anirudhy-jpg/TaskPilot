-- Migration: Add priority column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
CONSTRAINT check_priority CHECK (priority IN ('low', 'medium', 'high'));

-- Create index for efficient priority-based queries if needed
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);
