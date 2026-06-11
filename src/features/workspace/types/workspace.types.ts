export interface Workspace {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export type MemberRole = "owner" | "admin" | "member"

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: MemberRole
  joinedAt: string
  profile?: {
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export interface WorkspaceAnalytics {
  totalProjects: number
  totalTasks: number
  tasksByStatus: { name: string; value: number; color: string }[]
  projectTaskCounts: { name: string; total: number; completed: number }[]
}

