"use server"

import { ColumnService } from "../services/column.service"
import type { Column } from "@/features/project/types/project.types"
import { CreateColumnSchema } from "@/lib/validations/kanban.schema"

export interface ActionResponse {
  success: boolean
  error?: string
  column?: Column
}

export async function createColumnAction(
  projectId: string,
  name: string
): Promise<ActionResponse> {
  try {
    const result = CreateColumnSchema.safeParse({ projectId, name })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }
    const { projectId: vProjectId, name: vName } = result.data;

    const column = await ColumnService.createColumn(vProjectId, vName)
    return { success: true, column }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create column."
    return { success: false, error: message }
  }
}
