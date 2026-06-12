import { useRealtimeList } from "@/lib/realtime/subscribeToTable"
import type { Project, Task } from "../types/project.types"

/**
 * Maps a raw Supabase projects row to the Project type model.
 */
export function mapRealtimeProject(row: Record<string, any>): Project & { tasks: Task[] } {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description || null,
    status: row.status || "active",
    createdAt: row.created_at || new Date().toISOString(),
    createdBy: row.created_by,
    creatorEmail: null,
    creatorName: null,
    tasks: [],
    memberUserIds: row.member_user_ids || [],
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
  projects,
  setProjects,
}: UseProjectsRealtimeProps) {
  useRealtimeList<Project & { tasks: Task[] }>(
    projects,
    setProjects,
    {
      table: "projects",
      filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
      mapRow: mapRealtimeProject,
    }
  )
}
