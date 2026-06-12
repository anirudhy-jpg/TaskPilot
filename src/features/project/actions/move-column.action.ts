"use server"

import { revalidatePath } from "next/cache"
import { ColumnService } from "../services/column.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function moveColumnAction(
  columnId: string,
  position: number
): Promise<ActionResponse> {
  try {
    await ColumnService.moveColumn(columnId, position)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to move column."
    return { success: false, error: message }
  }
}
