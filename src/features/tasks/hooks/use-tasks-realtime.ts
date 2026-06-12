import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable"
import type { Task, TaskStatus, TaskPriority } from "@/features/project/types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"

/**
 * Maps a raw Supabase Realtime tasks row to the Task type model, connecting profile info.
 */
export function mapRealtimeTask(row: Record<string, any>, members: WorkspaceMember[]): Task {
  const assigneeId = row.assigned_to || row.assignee_id || null
  const member = assigneeId ? members.find((m) => m.userId === assigneeId) : null
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description || null,
    status: (row.status as TaskStatus) || "todo",
    columnId: row.column_id,
    priority: (row.priority as TaskPriority) || "medium",
    position: row.position ?? 0,
    assigneeId,
    createdAt: row.created_at || new Date().toISOString(),
    assignee: member
      ? {
          email: member.profile?.email || "",
          fullName: member.profile?.fullName || null,
          avatarUrl: member.profile?.avatarUrl || null,
        }
      : undefined,
  }
}

interface UseTasksRealtimeProps {
  projectId: string | null
  members: WorkspaceMember[]
  onInsert: (task: Task) => void
  onUpdate: (task: Task) => void
  onDelete: (taskId: string) => void
}

/**
 * Custom hook for subscribing to project tasks updates in realtime.
 */
export function useTasksRealtime({
  projectId,
  members,
  onInsert,
  onUpdate,
  onDelete,
}: UseTasksRealtimeProps) {
  useRealtimeSubscription({
    table: "tasks",
    filter: undefined,
    onPayload: (payload) => {
      if (!projectId) return

      if (payload.eventType === "INSERT") {
        if (payload.new.project_id !== projectId) return
        const newTask = mapRealtimeTask(payload.new, members)
        onInsert(newTask)
      } else if (payload.eventType === "UPDATE") {
        if (payload.new.project_id !== projectId) {
          // If task moved to a different project, remove it from current
          onDelete(payload.new.id)
          return
        }
        const updatedTask = mapRealtimeTask(payload.new, members)
        onUpdate(updatedTask)
      } else if (payload.eventType === "DELETE") {
        const deletedTaskId = payload.old.id
        onDelete(deletedTaskId)
      }
    },
  })
}
