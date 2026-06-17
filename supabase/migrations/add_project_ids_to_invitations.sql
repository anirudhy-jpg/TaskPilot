-- Migration: Add support for assigning multiple projects to invitations

-- 1. Add project_ids UUID array column to workspace_invitations
ALTER TABLE public.workspace_invitations ADD COLUMN IF NOT EXISTS project_ids UUID[];

-- 2. Backfill existing invitations: set project_ids to contain the single project_id if it exists
UPDATE public.workspace_invitations
SET project_ids = ARRAY[project_id]
WHERE project_id IS NOT NULL AND project_ids IS NULL;

-- 3. Update the handle_accepted_invitation trigger function to loop through and assign multiple projects
CREATE OR REPLACE FUNCTION public.handle_accepted_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Find the user ID matching the invite email
    SELECT id INTO v_user_id FROM public.profiles WHERE LOWER(email) = LOWER(NEW.email);
    
    IF v_user_id IS NOT NULL THEN
      -- Handle legacy single project_id if present
      IF NEW.project_id IS NOT NULL THEN
        INSERT INTO public.project_members (project_id, user_id)
        VALUES (NEW.project_id, v_user_id)
        ON CONFLICT (project_id, user_id) DO NOTHING;
      END IF;

      -- Handle multiple project_ids if present
      IF NEW.project_ids IS NOT NULL THEN
        FOREACH v_project_id IN ARRAY NEW.project_ids LOOP
          INSERT INTO public.project_members (project_id, user_id)
          VALUES (v_project_id, v_user_id)
          ON CONFLICT (project_id, user_id) DO NOTHING;
        END LOOP;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
