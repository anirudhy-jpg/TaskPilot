-- Migration: Task Activity Timeline, Comments, and Mentions

-- 1. Create task_activities table
CREATE TABLE IF NOT EXISTS public.task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS task_activities_task_id_idx ON public.task_activities (task_id);
CREATE INDEX IF NOT EXISTS task_activities_created_at_idx ON public.task_activities (created_at);
CREATE INDEX IF NOT EXISTS task_activities_actor_id_idx ON public.task_activities (actor_id);

-- 2. Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON public.task_comments (task_id);
CREATE INDEX IF NOT EXISTS task_comments_created_at_idx ON public.task_comments (created_at);

-- 3. Create task_comment_mentions table
CREATE TABLE IF NOT EXISTS public.task_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS task_comment_mentions_comment_id_idx ON public.task_comment_mentions (comment_id);
CREATE INDEX IF NOT EXISTS task_comment_mentions_mentioned_user_id_idx ON public.task_comment_mentions (mentioned_user_id);

-- 4. Alter notifications table to link to tasks and comments
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;

-- 5. Trigger for task activity logging
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- We attempt to get the user ID from auth.uid() if the change originated from the client or authenticated server action
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

DROP TRIGGER IF EXISTS trg_log_task_activity ON public.tasks;
CREATE TRIGGER trg_log_task_activity
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_activity();

-- 6. Row Level Security Policies
-- (RLS is intentionally disabled for these tables as per user request)

-- 7. Enable Realtime Publications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_activities') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activities;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_comment_mentions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comment_mentions;
    END IF;
  END IF;
END $$;
