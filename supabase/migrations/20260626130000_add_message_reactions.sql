-- 1. Create message_reactions table
CREATE TABLE message_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (message_id, user_id)
);

-- 2. Add indexes
CREATE INDEX idx_msg_reactions_msg ON message_reactions(message_id);

-- 3. Enable Realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
