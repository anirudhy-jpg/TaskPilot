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
  tasks?: Task[]
  memberUserIds?: string[]
}

export type TaskStatus = "todo" | "in_progress" | "done"
export type TaskPriority = "low" | "medium" | "high"

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  position: number
  assigneeId: string | null
  createdAt: string
  assignee?: {
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
