"use server"

import { revalidatePath } from "next/cache"
import { ColumnService } from "../services/column.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateColumnNameAction(
  columnId: string,
  name: string
): Promise<ActionResponse> {
  try {
    await ColumnService.updateColumnName(columnId, name)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to rename column."
    return { success: false, error: message }
  }
}
