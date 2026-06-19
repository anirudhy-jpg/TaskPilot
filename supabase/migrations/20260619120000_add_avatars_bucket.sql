-- Create a storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Since RLS is not being used, allow full public access to the avatars bucket
CREATE POLICY "Public Access for avatars" ON storage.objects FOR ALL USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
