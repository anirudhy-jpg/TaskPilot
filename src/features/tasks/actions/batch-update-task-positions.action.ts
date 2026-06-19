"use server"

import { TaskService } from "../services/task.service"


export interface ActionResponse {
  success: boolean
  error?: string
}

export async function batchUpdateTaskPositionsAction(
  updates: { id: string; columnId: string; position: number }[]
): Promise<ActionResponse> {
  try {
    await TaskService.batchUpdatePositions(updates)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task positions."
    return { success: false, error: message }
  }
}
