"use server"

import { revalidatePath } from "next/cache"
import { ColumnService } from "../services/column.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function deleteColumnAction(
  columnId: string,
  action: "move" | "delete",
  targetColumnId?: string
): Promise<ActionResponse> {
  try {
    await ColumnService.deleteColumn(columnId, action, targetColumnId)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete column."
    return { success: false, error: message }
  }
}
