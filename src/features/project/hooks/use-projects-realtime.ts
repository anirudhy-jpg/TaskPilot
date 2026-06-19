import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable"
import type { Project, Task, ProjectStatus } from "../types/project.types"

/**
 * Maps a raw Supabase projects row to the Project type model.
 */
export function mapRealtimeProject(row: Record<string, unknown>): Project & { tasks: Task[] } {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: (row.description as string | null) || null,
    status: (row.status as ProjectStatus) || "active",
    createdAt: (row.created_at as string) || new Date().toISOString(),
    createdBy: row.created_by as string,
    creatorEmail: null,
    creatorName: null,
    tasks: [],
    memberUserIds: (row.member_user_ids as string[]) || [],
  }
}

interface UseProjectsRealtimeProps {
  workspaceId: string | null
  projects: (Project & { tasks: Task[] })[]
  setProjects: React.Dispatch<React.SetStateAction<(Project & { tasks: Task[] })[]>>
}

/**
 * Hook for subscribing to projects within a workspace in realtime.
 */
export function useProjectsRealtime({
  workspaceId,
  // Removed _projects
  setProjects,
}: UseProjectsRealtimeProps) {
  useRealtimeSubscription({
    table: "projects",
    filter: undefined,
    onPayload: (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload
      if (eventType === "INSERT" && newRow) {
        if (newRow.workspace_id === workspaceId) {
          const mapped = mapRealtimeProject(newRow)
          setProjects((prev) => {
            const exists = prev.some((p) => p.id === mapped.id)
            if (exists) return prev
            return [...prev, mapped]
          })
        }
      } else if (eventType === "UPDATE" && newRow) {
        if (newRow.workspace_id === workspaceId) {
          const mapped = mapRealtimeProject(newRow)
          setProjects((prev) =>
            prev.map((p) => {
              if (p.id === mapped.id) {
                return {
                  ...p,
                  ...mapped,
                  tasks: p.tasks, // preserve existing tasks
                }
              }
              return p
            })
          )
        } else {
          // If the project was moved to a different workspace, remove it from local state
          setProjects((prev) => prev.filter((p) => p.id !== newRow.id))
        }
      } else if (eventType === "DELETE" && oldRow) {
        setProjects((prev) => prev.filter((p) => p.id !== oldRow.id))
      }
    },
  })
}
