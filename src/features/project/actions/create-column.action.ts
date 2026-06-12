"use server"

import { revalidatePath } from "next/cache"
import { ColumnService } from "../services/column.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function createColumnAction(
  projectId: string,
  name: string
): Promise<ActionResponse> {
  try {
    await ColumnService.createColumn(projectId, name)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create column."
    return { success: false, error: message }
  }
}
