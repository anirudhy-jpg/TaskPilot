"use server"

import { ColumnService } from "../services/column.service"
import type { Column } from "@/features/project/types/project.types"

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
    const column = await ColumnService.createColumn(projectId, name)
    return { success: true, column }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create column."
    return { success: false, error: message }
  }
}
