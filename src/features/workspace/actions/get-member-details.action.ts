"use server"

import { createClient } from "@/lib/supabase/server"
import { mapTask } from "@/features/tasks/services/task.service"
import type { Task, Project } from "@/features/project/types/project.types"

export interface MemberDetailsResponse {
  success: boolean
  projectsJoined?: Project[]
  tasksAssigned?: Task[]
  error?: string
}

export async function getMemberDetailsAction(
  workspaceId: string,
  memberUserId: string
): Promise<MemberDetailsResponse> {
  try {
    const supabase = await createClient()

    // 1. Fetch all projects in the workspace along with their project members (respects RLS)
    const { data: projectsData, error: projErr } = await supabase
      .from("projects")
      .select(`
        id,
        workspace_id,
        name,
        description,
        created_by,
        created_at,
        project_members!left(user_id)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (projErr) {
      console.error("Error fetching projects in getMemberDetailsAction:", projErr)
      return { success: false, error: projErr.message }
    }

    // Filter projects where this member is a creator or is registered as a project member
    type ProjectRow = {
      id: string; workspace_id: string; name: string;
      description: string | null; created_by: string; created_at: string;
      project_members: { user_id: string }[];
    };
    const matchedProjects = (projectsData || []).filter((p: ProjectRow) => {
      const isCreator = p.created_by === memberUserId
      const isMember = (p.project_members || []).some((pm: { user_id: string }) => pm.user_id === memberUserId)
      return isCreator || isMember
    })

    const projectsJoined: Project[] = matchedProjects.map((p: ProjectRow) => ({
      id: p.id,
      workspaceId: p.workspace_id,
      name: p.name,
      description: p.description,
      status: "active",
      createdAt: p.created_at,
      createdBy: p.created_by,
      tasks: [],
      columns: []
    }))

    // 2. Fetch tasks in these projects
    let memberTasks: Task[] = []
    const projectIds = projectsJoined.map(p => p.id)

    if (projectIds.length > 0) {
      const { data: tasksData, error: tasksErr } = await supabase
        .from("tasks")
        .select("id, project_id, title, description, column_id, type, priority, position, assigned_to, created_at")
        .in("project_id", projectIds)

      if (tasksErr) {
        console.error("Error fetching tasks in getMemberDetailsAction:", tasksErr)
        return { success: false, error: tasksErr.message }
      }

      if (tasksData) {
        type TaskRow = { id: string; project_id: string; assigned_to: string | null; [key: string]: unknown };
        memberTasks = tasksData
          .filter((t: TaskRow) => t.assigned_to === memberUserId)
          .map((row: TaskRow) => {
            const mapped = mapTask(row as Parameters<typeof mapTask>[0], null)
            const proj = projectsJoined.find(p => p.id === row.project_id)
            return {
              ...mapped,
              projectName: proj?.name || "Unknown Project"
            } as Task & { projectName?: string }
          })
      }
    }

    return {
      success: true,
      projectsJoined,
      tasksAssigned: memberTasks
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load member details."
    return { success: false, error: message }
  }
}
