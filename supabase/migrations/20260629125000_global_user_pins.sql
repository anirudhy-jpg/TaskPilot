-- Create user_pins table for globally pinning projects, tasks, and conversations
CREATE TABLE user_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'conversation')),
    entity_id UUID NOT NULL,
    display_order DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, entity_type, entity_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_user_pins_user_type ON user_pins(user_id, entity_type);
CREATE INDEX idx_user_pins_entity ON user_pins(entity_type, entity_id);

-- Enable RLS
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

-- Users can manage their own pins
CREATE POLICY "Users can manage their own pins" ON user_pins
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_pins;
