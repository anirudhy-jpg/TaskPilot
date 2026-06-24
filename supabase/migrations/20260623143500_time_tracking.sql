-- Add estimated_minutes to tasks
ALTER TABLE tasks ADD COLUMN estimated_minutes integer DEFAULT 0;

-- Create time_entries table
CREATE TABLE time_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    duration_seconds integer,
    note text,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
