ALTER TABLE messages
ADD COLUMN attachment_name text,
ADD COLUMN attachment_path text,
ADD COLUMN attachment_size bigint,
ADD COLUMN attachment_mime_type text,
ADD COLUMN attachment_uploaded_at timestamptz;
