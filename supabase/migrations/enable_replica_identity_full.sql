-- Migration: Enable replica identity FULL for workspace_members and workspace_invitations
-- This allows real-time DELETE events to propagate columns like workspace_id and email so that client-side filters match on delete.

ALTER TABLE workspace_members REPLICA IDENTITY FULL;
ALTER TABLE workspace_invitations REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;
