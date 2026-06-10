// ─── Workspace ───────────────────────────────────────────────
export interface Workspace {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

// ─── Workspace Member ────────────────────────────────────────
export type MemberRole = "owner" | "admin" | "member"

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: MemberRole
  joinedAt: string
  // Joined profile info (populated via joins)
  profile?: {
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}

// ─── Project ─────────────────────────────────────────────────
export type ProjectStatus = "active" | "archived" | "completed"

export interface Project {
  id: string
  workspaceId: string
  name: string
  description: string | null
  status: ProjectStatus
  createdAt: string
  createdBy?: string
  creatorEmail?: string | null
  creatorName?: string | null
  // Nested tasks (populated when needed)
  tasks?: Task[]
  memberUserIds?: string[]
}

// ─── Task ────────────────────────────────────────────────────
export type TaskStatus = "todo" | "in_progress" | "done"
export type TaskPriority = "low" | "medium" | "high"

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  createdAt: string
  // Populated via join
  assignee?: {
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}

// ─── Analytics ───────────────────────────────────────────────
export interface WorkspaceAnalytics {
  totalProjects: number
  totalTasks: number
  tasksByStatus: { name: string; value: number; color: string }[]
  projectTaskCounts: { name: string; total: number; completed: number }[]
}
