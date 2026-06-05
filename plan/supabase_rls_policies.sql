-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  RLS Policies for TaskPilot Workspace Tables                ║
-- ║  Run this in Supabase Dashboard → SQL Editor                ║
-- ║  (Safe to re-run — drops existing policies first)           ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ─── WORKSPACES ──────────────────────────────────────────────────

-- Ensure RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;

-- Users can SELECT workspaces they own or are a member of
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Authenticated users can create workspaces (they must be the owner)
CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
  );

-- Only the owner can update their workspace
CREATE POLICY "Owners can update workspaces"
  ON workspaces FOR UPDATE
  TO authenticated
  USING ( owner_id = (SELECT auth.uid()) )
  WITH CHECK ( owner_id = (SELECT auth.uid()) );

-- Only the owner can delete their workspace
CREATE POLICY "Owners can delete workspaces"
  ON workspaces FOR DELETE
  TO authenticated
  USING ( owner_id = (SELECT auth.uid()) );


-- ─── WORKSPACE_MEMBERS ──────────────────────────────────────────

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can add workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can remove workspace members" ON workspace_members;

-- Members can see other members in workspaces they belong to
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT auth.uid())
    )
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Users can add themselves as members, or workspace owners can add others
CREATE POLICY "Owners can add workspace members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Users can leave, or workspace owners can remove members
CREATE POLICY "Owners can remove workspace members"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  );


-- ─── PROJECTS ───────────────────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Members can create projects" ON projects;
DROP POLICY IF EXISTS "Members can update projects" ON projects;
DROP POLICY IF EXISTS "Members can delete projects" ON projects;

-- Workspace members can view projects
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT auth.uid())
    )
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Workspace members can create projects
CREATE POLICY "Members can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT auth.uid())
    )
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Workspace members can update projects
CREATE POLICY "Members can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT auth.uid())
    )
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT auth.uid())
    )
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Workspace members can delete projects
CREATE POLICY "Members can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT auth.uid())
    )
    OR workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = (SELECT auth.uid())
    )
  );


-- ─── TASKS ──────────────────────────────────────────────────────

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Members can delete tasks" ON tasks;

-- Members can view tasks in their workspace projects
CREATE POLICY "Members can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = (SELECT auth.uid())
      )
      OR workspace_id IN (
        SELECT id FROM workspaces
        WHERE owner_id = (SELECT auth.uid())
      )
    )
  );

-- Members can create tasks
CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = (SELECT auth.uid())
      )
      OR workspace_id IN (
        SELECT id FROM workspaces
        WHERE owner_id = (SELECT auth.uid())
      )
    )
  );

-- Members can update tasks
CREATE POLICY "Members can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = (SELECT auth.uid())
      )
      OR workspace_id IN (
        SELECT id FROM workspaces
        WHERE owner_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = (SELECT auth.uid())
      )
      OR workspace_id IN (
        SELECT id FROM workspaces
        WHERE owner_id = (SELECT auth.uid())
      )
    )
  );

-- Members can delete tasks
CREATE POLICY "Members can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = (SELECT auth.uid())
      )
      OR workspace_id IN (
        SELECT id FROM workspaces
        WHERE owner_id = (SELECT auth.uid())
      )
    )
  );


-- ─── PROFILES (if not already set up) ───────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ( id = (SELECT auth.uid()) );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ( id = (SELECT auth.uid()) );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ( id = (SELECT auth.uid()) )
  WITH CHECK ( id = (SELECT auth.uid()) );
