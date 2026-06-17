-- Migration: Update workspace_invitations table to make expires_at nullable
ALTER TABLE public.workspace_invitations ALTER COLUMN expires_at DROP NOT NULL;
