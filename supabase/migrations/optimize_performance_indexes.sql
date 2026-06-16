-- Performance optimization indexes

-- 1. Index for fetching and sorting tasks by project and position
CREATE INDEX IF NOT EXISTS idx_tasks_project_id_position ON tasks(project_id, position);

-- 2. Index for assignee lookups (e.g. Teams page filter)
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- 3. Index for fetching and sorting columns by project (board_id) and position
CREATE INDEX IF NOT EXISTS idx_columns_board_id_position ON columns(board_id, position);

-- 4. Index for workspace memberships lookup by user ID
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

-- 5. Index for fetching and sorting projects in a workspace by creation date
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id_created_at ON projects(workspace_id, created_at DESC);
