-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON public.task_attachments(task_id);

-- Create attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects (Supabase storage uses RLS by default)
CREATE POLICY "Allow authenticated uploads to attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Allow authenticated viewing of attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments');

CREATE POLICY "Allow authenticated deletion of attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments');
