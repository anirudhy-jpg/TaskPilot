export type ProjectStatus = "active" | "archived" | "completed"

export interface Column {
  id: string
  boardId: string
  name: string
  position: number
  createdAt: string
}

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
  columns?: Column[]
  memberUserIds?: string[]
}

export type TaskStatus = string
export type TaskPriority = "low" | "medium" | "high"

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus // mapped client-side to columnId/status representation
  columnId: string
  priority: TaskPriority
  position: number // double precision fractional index
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

