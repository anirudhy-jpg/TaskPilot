-- 1. conversations (workspace‑scoped, one per user pair)
CREATE TABLE conversations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    pair_key      text NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz DEFAULT now()
);

-- Enforce a single conversation per user pair within a workspace
CREATE UNIQUE INDEX uq_conversations_workspace_pairkey
    ON conversations(workspace_id, pair_key);

CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);

-- 2. conversation_members (exactly 2 per 1‑to‑1 chat)
CREATE TABLE conversation_members (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_read_at      timestamptz DEFAULT now(),
    joined_at         timestamptz DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_conv_members_conv ON conversation_members(conversation_id);
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);

-- 3. messages
CREATE TABLE messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content         text NOT NULL,
    edited_at       timestamptz,
    deleted_at      timestamptz,
    created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_messages_conv   ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- 4. Enable Realtime for messages AND conversations tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
