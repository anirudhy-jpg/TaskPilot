-- Migration: Add actor_id column to notifications table, disable RLS, and enable Realtime

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Disable RLS to ensure public accessibility as per project requirements
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Enable Realtime for notifications table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;
