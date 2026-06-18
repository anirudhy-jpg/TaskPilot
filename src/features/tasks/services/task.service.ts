import { createClient } from "@/lib/supabase/server"
import type { Task, TaskStatus, TaskPriority } from "@/features/project/types/project.types"

export class TaskService {
  /**
   * Get all tasks for a project.
   */
  static async getTasksByProject(projectId: string): Promise<Task[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        id, project_id, title, description, status, column_id, priority, position, assigned_to, created_at,
        assignee:profiles!tasks_assigned_to_fkey(email, full_name, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("position", { ascending: true })

    if (error) {
      // Fallback: query without the join and select only guaranteed columns
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("tasks")
        .select("id, project_id, title, description, status, column_id, priority, position, assigned_to, created_at")
        .eq("project_id", projectId)
        .order("position", { ascending: true })

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

    // Get the projects the user actually has access to
    const { ProjectService } = await import("@/features/project/services/project.service")
    const projects = await ProjectService.getProjectsByWorkspace(workspaceId)

    if (!projects || projects.length === 0) return []

    const projectIds = projects.map((p) => p.id)

    const { data, error } = await supabase
      .from("tasks")
      .select("id, project_id, title, description, status, column_id, priority, position, assigned_to, created_at")
      .in("project_id", projectIds)
      .order("position", { ascending: true })

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
    columnId: string
    priority?: TaskPriority
    assigneeId?: string
  }): Promise<Task> {
    const supabase = await createClient()

    // Calculate next position for new task: place at end of column (add 1000 to max position)
    const { data: maxPosRow } = await supabase
      .from("tasks")
      .select("position")
      .eq("project_id", input.projectId)
      .eq("column_id", input.columnId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (maxPosRow?.position ?? 0) + 1000.0

    // Build insert data
    const insertData: Record<string, unknown> = {
      project_id: input.projectId,
      title: input.title,
      column_id: input.columnId,
      status: input.columnId, // legacy fallback uses column_id UUID
      position: nextPosition,
    }
    if (input.description) insertData.description = input.description
    if (input.priority) insertData.priority = input.priority
    if (input.assigneeId) insertData.assigned_to = input.assigneeId

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertData)
      .select(`
        id, project_id, title, description, status, column_id, priority, position, created_at, assigned_to,
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
   * Update a task's column (status).
   */
  static async updateTaskStatus(
    taskId: string,
    columnId: string
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tasks")
      .update({
        column_id: columnId,
        status: columnId, // legacy fallback
      })
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

  /**
   * Move a task to a new column and/or position.
   * Used by drag-and-drop to persist column changes and reordering.
   */
  static async moveTask(
    taskId: string,
    columnId: string,
    position: number
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tasks")
      .update({
        column_id: columnId,
        status: columnId, // legacy fallback
        position,
      })
      .eq("id", taskId)

    if (error) {
      console.error("Error moving task:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Update task fields (title, description, priority).
   */
  static async updateTask(
    taskId: string,
    updates: {
      title?: string
      description?: string | null
      priority?: TaskPriority
    }
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)

    if (error) {
      console.error("Error updating task:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Batch update positions for multiple tasks.
   * Deprecated but kept for type compatibility if referenced elsewhere.
   */
  static async batchUpdatePositions(
    updates: { id: string; status: TaskStatus; position: number }[]
  ): Promise<void> {
    const supabase = await createClient()

    await Promise.all(
      updates.map(async ({ id, status, position }) => {
        const { error } = await supabase
          .from("tasks")
          .update({
            column_id: status,
            status,
            position,
          })
          .eq("id", id);
        if (error) {
          console.error(`Error updating position for task ${id}:`, error);
          throw new Error(error.message);
        }
      })
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────
export type TaskRow = {
  id?: string | null;
  project_id?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  column_id?: string | null;
  priority?: string | null;
  position?: number | null;
  assignee_id?: string | null;
  assigned_to?: string | null;
  created_at?: string | null;
  subtasks?: unknown;
  [key: string]: unknown;
};

export type AssigneeRow = {
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
};

export function mapTask(row: TaskRow, assigneeDataRaw: AssigneeRow | AssigneeRow[] | null | undefined): Task {
  const assigneeData = Array.isArray(assigneeDataRaw) ? assigneeDataRaw[0] : assigneeDataRaw;
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    description: (row.description as string | null) || null,
    status: (row.status as TaskStatus) || "todo",
    columnId: row.column_id as string,
    priority: (row.priority as TaskPriority) || "medium",
    position: (row.position as number) ?? 0,
    assigneeId: (row.assignee_id as string) || (row.assigned_to as string) || null,
    createdAt: row.created_at as string,
    assignee: assigneeData
      ? {
          email: assigneeData.email as string,
          fullName: (assigneeData.full_name as string | null) || null,
          avatarUrl: (assigneeData.avatar_url as string | null) || null,
        }
      : undefined,
    subtasks: row.subtasks as Task['subtasks'],
  }
}
