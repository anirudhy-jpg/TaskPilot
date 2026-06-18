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

export type TaskStatus = string // @deprecated
export type TaskPriority = "low" | "medium" | "high"

export const TASK_TYPES = [
  "task",
  "feature",
  "bug",
  "enhancement",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  /** @deprecated Board placement is now exclusively determined by columnId */
  status?: string | null 
  columnId: string
  type: TaskType
  priority: TaskPriority
  position: number // double precision fractional index
  assigneeId: string | null
  createdAt: string
  assignee?: {
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
  subtasks?: TaskSubtask[]
}

export interface TaskSubtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  status: string
  priority: "low" | "medium" | "high"
  assigneeId: string | null
  position: number
  createdAt: string
  updatedAt: string
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

export const TASK_ACTIVITY_TYPES = {
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  PRIORITY_CHANGED: "PRIORITY_CHANGED",
  TYPE_CHANGED: "TYPE_CHANGED",
  DUE_DATE_CHANGED: "DUE_DATE_CHANGED",
  ASSIGNEE_ADDED: "ASSIGNEE_ADDED",
  ASSIGNEE_REMOVED: "ASSIGNEE_REMOVED",
  COLUMN_MOVED: "COLUMN_MOVED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_REOPENED: "TASK_REOPENED",
  COMMENT_ADDED: "COMMENT_ADDED",
  COMMENT_EDITED: "COMMENT_EDITED",
  COMMENT_DELETED: "COMMENT_DELETED",
  ATTACHMENT_ADDED: "ATTACHMENT_ADDED",
  ATTACHMENT_REMOVED: "ATTACHMENT_REMOVED",
  MEMBER_MENTIONED: "MEMBER_MENTIONED",
} as const

export type TaskActivityType = keyof typeof TASK_ACTIVITY_TYPES

export interface TaskActivity {
  id: string
  taskId: string
  actorId: string | null
  actionType: TaskActivityType
  oldValue: unknown | null
  newValue: unknown | null
  metadata: Record<string, unknown> | null
  createdAt: string
  actor?: {
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export interface TaskComment {
  id: string
  taskId: string
  authorId: string
  content: string
  edited: boolean
  createdAt: string
  updatedAt: string
  author?: {
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
  mentions?: TaskCommentMention[]
}

export interface TaskCommentMention {
  id: string
  commentId: string
  mentionedUserId: string
  createdAt: string
  mentionedUser?: {
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export type TimelineItem = 
  | ({ type: 'activity' } & TaskActivity)
  | ({ type: 'comment' } & TaskComment)
