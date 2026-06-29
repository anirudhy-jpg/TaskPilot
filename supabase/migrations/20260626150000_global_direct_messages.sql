-- ============================================================
-- Global Direct Messages Migration
-- ============================================================
-- Converts workspace-scoped DMs to globally-scoped DMs.
-- A conversation now belongs to exactly two users globally.
-- Two users may message if they share at least one workspace
-- (enforced at the service layer, not the DB layer).
-- ============================================================

-- ── Step 1: Merge duplicate conversations ──────────────────
-- If the same pair_key exists for multiple workspace_ids,
-- keep the oldest conversation and re-point everything else to it.

DO $$
DECLARE
  dup RECORD;
  canonical_id uuid;
  dup_id       uuid;
BEGIN
  -- Find every pair_key that has more than one conversation row
  FOR dup IN
    SELECT pair_key
    FROM conversations
    GROUP BY pair_key
    HAVING COUNT(*) > 1
  LOOP
    -- Pick the oldest conversation as the canonical one
    SELECT id INTO canonical_id
    FROM conversations
    WHERE pair_key = dup.pair_key
    ORDER BY created_at ASC
    LIMIT 1;

    -- For every other (duplicate) conversation with this pair_key:
    FOR dup_id IN
      SELECT id FROM conversations
      WHERE pair_key = dup.pair_key AND id <> canonical_id
    LOOP
      -- Re-point all messages to the canonical conversation
      UPDATE messages
      SET conversation_id = canonical_id
      WHERE conversation_id = dup_id;

      -- Merge conversation_members: insert any member not yet in canonical,
      -- keeping the earlier last_read_at and joined_at values.
      INSERT INTO conversation_members (conversation_id, user_id, last_read_at, joined_at)
      SELECT canonical_id, user_id, last_read_at, joined_at
      FROM conversation_members
      WHERE conversation_id = dup_id
      ON CONFLICT (conversation_id, user_id) DO UPDATE
        SET last_read_at = LEAST(
              EXCLUDED.last_read_at,
              conversation_members.last_read_at
            ),
            joined_at = LEAST(
              EXCLUDED.joined_at,
              conversation_members.joined_at
            );

      -- Delete the duplicate membership rows
      DELETE FROM conversation_members WHERE conversation_id = dup_id;

      -- Delete the duplicate conversation row
      DELETE FROM conversations WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- ── Step 2: Make workspace_id nullable (global conversations) ─
ALTER TABLE conversations
  ALTER COLUMN workspace_id DROP NOT NULL;

-- ── Step 3: Set all existing workspace_id values to NULL ────
-- All current DMs become global; workspace_id is no longer meaningful.
UPDATE conversations SET workspace_id = NULL;

-- ── Step 4: Drop workspace-scoped indexes ───────────────────
DROP INDEX IF EXISTS uq_conversations_workspace_pairkey;
DROP INDEX IF EXISTS idx_conversations_workspace;

-- ── Step 5: Add a global pair_key uniqueness index ──────────
-- Ensures exactly one conversation per user pair, globally.
CREATE UNIQUE INDEX uq_conversations_pairkey
  ON conversations(pair_key);

-- ── Step 6: Add index for pair_key lookups (performance) ────
-- (The unique index already covers this, but explicit for clarity)
-- Already covered by the unique index above.

-- ── Step 7: Enable REPLICA IDENTITY FULL on conversations ───
-- Ensures Realtime UPDATE/DELETE payloads include old row data.
ALTER TABLE conversations REPLICA IDENTITY FULL;
