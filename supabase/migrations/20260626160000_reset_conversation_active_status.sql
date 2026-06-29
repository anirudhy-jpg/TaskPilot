-- ============================================================
-- Fix: Reset stale is_active flags after global DM migration
-- ============================================================
-- Before the global DM migration, conversations were workspace-
-- scoped and is_active was set to false when users left a
-- specific workspace. After going global, is_active is now
-- re-evaluated at message-send time (usersShareAnyWorkspace).
-- Any stale is_active=false values left over are incorrect and
-- must be reset so users can send messages again.
-- ============================================================

-- Reset all conversations to active.
-- The send-time check in MessagingService.sendMessage() will
-- immediately re-deactivate any conversation where users
-- genuinely no longer share any workspace.
UPDATE conversations SET is_active = true;
