"use server"

import { revalidatePath } from "next/cache"
import { ColumnService } from "../services/column.service"
import { UpdateColumnNameSchema } from "@/lib/validations/kanban.schema"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateColumnNameAction(
  columnId: string,
  name: string
): Promise<ActionResponse> {
  try {
    const result = UpdateColumnNameSchema.safeParse({ name })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }
    const validatedName = result.data.name;

    await ColumnService.updateColumnName(columnId, validatedName)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to rename column."
    return { success: false, error: message }
  }
}
