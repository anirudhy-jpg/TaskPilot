-- Add reply_to_message_id column to messages table
ALTER TABLE messages
ADD COLUMN reply_to_message_id uuid;

ALTER TABLE messages
ADD CONSTRAINT messages_reply_to_message_id_fkey
FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);
