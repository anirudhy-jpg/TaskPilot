import { createClient } from "@/lib/supabase/server"
import type { Task, TaskStatus, TaskPriority } from "@/types/workspace.types"

export class TaskService {
  /**
   * Get all tasks for a project.
   */
  static async getTasksByProject(projectId: string): Promise<Task[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        id, project_id, title, description, status, assigned_to, created_at,
        assignee:profiles!tasks_assigned_to_fkey(email, full_name, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      // Fallback: query without the join and select only guaranteed columns
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("tasks")
        .select("id, project_id, title, description, status, assigned_to, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (fallbackError) {
        console.error("Error fetching tasks:", fallbackError)
        throw new Error(fallbackError.message)
      }

      return (fallbackData || []).map((row) => mapTask(row, null))
    }

    return (data || []).map((row) => mapTask(row, row.assignee))
  }

  /**
   * Get all tasks across all projects in a workspace (for analytics).
   */
  static async getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
    const supabase = await createClient()

    // First get all project IDs for this workspace
    const { data: projects, error: projErr } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId)

    if (projErr) {
      console.error("Error fetching project IDs:", projErr)
      throw new Error(projErr.message)
    }

    if (!projects || projects.length === 0) return []

    const projectIds = projects.map((p) => p.id)

    const { data, error } = await supabase
      .from("tasks")
      .select("id, project_id, title, description, status, assigned_to, created_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching workspace tasks:", error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => mapTask(row, null))
  }

  /**
   * Create a new task in a project.
   */
  static async createTask(input: {
    projectId: string
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    assigneeId?: string
  }): Promise<Task> {
    const supabase = await createClient()

    // Build insert data with only guaranteed existing columns
    const insertData: Record<string, unknown> = {
      project_id: input.projectId,
      title: input.title,
    }
    if (input.description) insertData.description = input.description
    if (input.status) insertData.status = input.status
    if (input.assigneeId) insertData.assigned_to = input.assigneeId

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertData)
      .select(`
        id, project_id, title, description, status, created_at, assigned_to,
        assignee:profiles!tasks_assigned_to_fkey(email, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error creating task:", error)
      throw new Error(error.message)
    }

    return mapTask(data, data.assignee)
  }

  /**
   * Update a task's status.
   */
  static async updateTaskStatus(
    taskId: string,
    status: TaskStatus
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId)

    if (error) {
      console.error("Error updating task status:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Update a task's assignee.
   */
  static async updateTaskAssignee(
    taskId: string,
    assigneeId: string | null
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: assigneeId })
      .eq("id", taskId)

    if (error) {
      console.error("Error updating task assignee:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Delete a task.
   */
  static async deleteTask(taskId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from("tasks").delete().eq("id", taskId)

    if (error) {
      console.error("Error deleting task:", error)
      throw new Error(error.message)
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTask(row: any, assigneeData: any): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status || "todo",
    priority: row.priority || "medium",
    assigneeId: row.assignee_id || row.assigned_to || null,
    createdAt: row.created_at,
    assignee: assigneeData
      ? {
          email: assigneeData.email,
          fullName: assigneeData.full_name,
          avatarUrl: assigneeData.avatar_url,
        }
      : undefined,
  }
}
