import { createClient } from "@/lib/supabase/server"
import type { Column } from "../types/project.types"

export class ColumnService {
  /**
   * Get all columns for a project, sorted by position.
   */
  static async getColumnsByProject(projectId: string): Promise<Column[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("columns")
      .select("id, board_id, name, position, created_at")
      .eq("board_id", projectId)
      .order("position", { ascending: true })

    if (error) {
      console.error("Error fetching columns:", error)
      throw new Error(error.message)
    }

    if (!data || data.length === 0) {
      console.log(`Seeding default columns for project ${projectId}`)
      const defaultCols = [
        { board_id: projectId, name: "To Do", position: 1000.0 },
        { board_id: projectId, name: "In Progress", position: 2000.0 },
        { board_id: projectId, name: "Done", position: 3000.0 }
      ]

      const { data: insertedData, error: insertError } = await supabase
        .from("columns")
        .insert(defaultCols)
        .select()

      if (!insertError && insertedData) {
        return insertedData.map((row) => ({
          id: row.id,
          boardId: row.board_id,
          name: row.name,
          position: row.position,
          createdAt: row.created_at,
        })).sort((a, b) => a.position - b.position)
      } else {
        console.error("Error seeding default columns:", insertError)
      }
    }

    return (data || []).map((row) => ({
      id: row.id,
      boardId: row.board_id,
      name: row.name,
      position: row.position,
      createdAt: row.created_at,
    }))
  }

  /**
   * Create a new column in a project.
   */
  static async createColumn(projectId: string, name: string): Promise<Column> {
    const supabase = await createClient()

    // Find the max position to append the column (add 1000.0)
    const { data: maxPosRow } = await supabase
      .from("columns")
      .select("position")
      .eq("board_id", projectId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Validate maximum columns limit (5 columns)
    const { count, error: countErr } = await supabase
      .from("columns")
      .select("id", { count: "exact", head: true })
      .eq("board_id", projectId)

    if (countErr) {
      console.error("Error checking columns count:", countErr)
    } else if (count !== null && count >= 5) {
      throw new Error("A project cannot have more than 5 columns.")
    }

    const nextPosition = (maxPosRow?.position ?? 0) + 1000.0

    const { data, error } = await supabase
      .from("columns")
      .insert({
        board_id: projectId,
        name,
        position: nextPosition,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating column:", error)
      throw new Error(error.message)
    }

    return {
      id: data.id,
      boardId: data.board_id,
      name: data.name,
      position: data.position,
      createdAt: data.created_at,
    }
  }

  /**
   * Rename a column.
   */
  static async updateColumnName(columnId: string, name: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("columns")
      .update({ name })
      .eq("id", columnId)

    if (error) {
      console.error("Error updating column name:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Move a column to a new fractional position.
   */
  static async moveColumn(columnId: string, position: number): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("columns")
      .update({ position })
      .eq("id", columnId)

    if (error) {
      console.error("Error moving column:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Delete a column safely using the atomic Postgres RPC function.
   * Action must be 'move' or 'delete'.
   */
  static async deleteColumn(
    columnId: string,
    action: "move" | "delete",
    targetColumnId?: string
  ): Promise<void> {
    const supabase = await createClient()

    try {
      const { error } = await supabase.rpc("delete_column_and_handle_tasks", {
        p_column_id: columnId,
        p_action: action,
        p_target_column_id: targetColumnId || null,
      })

      if (error) {
        if (error.code === "P0001" || error.message.includes("Could not find the function")) {
          console.warn("RPC function missing. Falling back to JS client-side deletion.")
          await ColumnService.deleteColumnFallback(columnId, action, targetColumnId)
          return
        }
        console.error("Error deleting column safely via RPC:", error)
        throw new Error(error.message)
      }
    } catch (err: any) {
      if (err.message?.includes("Could not find the function")) {
        console.warn("RPC function missing in catch. Falling back to JS client-side deletion.")
        await ColumnService.deleteColumnFallback(columnId, action, targetColumnId)
        return
      }
      throw err
    }
  }

  static async deleteColumnFallback(
    columnId: string,
    action: "move" | "delete",
    targetColumnId?: string
  ): Promise<void> {
    const supabase = await createClient()

    if (action === "move") {
      if (!targetColumnId) {
        throw new Error("Target column ID must be provided when moving tasks")
      }

      // Get all tasks in source column
      const { data: tasks, error: fetchErr } = await supabase
        .from("tasks")
        .select("id, position")
        .eq("column_id", columnId)
        .order("position", { ascending: true })

      if (fetchErr) throw new Error(fetchErr.message)

      if (tasks && tasks.length > 0) {
        // Find max position in target column
        const { data: maxPosRow } = await supabase
          .from("tasks")
          .select("position")
          .eq("column_id", targetColumnId)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle()

        const maxPos = maxPosRow?.position ?? 0.0

        // Update each task sequentially
        const updates = tasks.map((task, idx) =>
          supabase
            .from("tasks")
            .update({
              column_id: targetColumnId,
              status: targetColumnId,
              position: maxPos + (idx + 1) * 1000.0,
            })
            .eq("id", task.id)
        )
        await Promise.all(updates)
      }
    } else {
      // Delete tasks in source column
      const { error: deleteTasksErr } = await supabase
        .from("tasks")
        .delete()
        .eq("column_id", columnId)

      if (deleteTasksErr) throw new Error(deleteTasksErr.message)
    }

    // Delete the column itself
    const { error: deleteColumnErr } = await supabase
      .from("columns")
      .delete()
      .eq("id", columnId)

    if (deleteColumnErr) throw new Error(deleteColumnErr.message)
  }
}
