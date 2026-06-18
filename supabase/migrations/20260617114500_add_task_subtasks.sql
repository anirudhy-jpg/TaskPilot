-- Migration: Task Subtasks
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS task_subtasks_task_id_idx ON public.task_subtasks (task_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_subtasks') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.task_subtasks;
    END IF;
  END IF;
END $$;
