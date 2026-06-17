-- Add new columns to task_subtasks for full Jira-style subtasks

ALTER TABLE public.task_subtasks
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'todo',
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS task_subtasks_assignee_id_idx ON public.task_subtasks(assignee_id);
