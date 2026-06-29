-- ============================================================
-- Migration: Add cleared_at to conversation_members
-- ============================================================
-- This enables "soft deleting" a chat for a specific user.
-- When a user deletes a conversation, we record the timestamp.
-- Messages created before this timestamp will be hidden from their view.
-- The conversation itself is also hidden from their list until a new message arrives.

ALTER TABLE conversation_members ADD COLUMN cleared_at timestamptz;
