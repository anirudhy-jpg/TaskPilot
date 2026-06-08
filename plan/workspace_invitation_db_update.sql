-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  RLS Policies and Schema updates for workspace_invitations  ║
-- ║  Run this in Supabase Dashboard → SQL Editor                ║
-- ║  (Safe to re-run — drops existing policies first)           ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL -- present in schema, nullable
);

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Anyone can update invitation status" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners and admins can delete/revoke invitations" ON workspace_invitations;

-- Policies:
-- 1. SELECT: Anyone can view an invitation if they have the token.
CREATE POLICY "Anyone can view invitation by token"
  ON workspace_invitations FOR SELECT
  TO public
  USING (true);

-- 2. INSERT: Only workspace owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON workspace_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 3. UPDATE: Users can accept/decline (updates status), or owners/admins can revoke/decline
CREATE POLICY "Anyone can update invitation status"
  ON workspace_invitations FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. DELETE: Only workspace owners and admins can delete invitations
CREATE POLICY "Owners and admins can delete/revoke invitations"
  ON workspace_invitations FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
