"use server"

import { TaskService } from "../services/task.service"


export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateTaskStatusAction(
  taskId: string,
  columnId: string
): Promise<ActionResponse> {
  try {
    await TaskService.updateTaskStatus(taskId, columnId)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task status."
    return {
      success: false,
      error: message,
    }
  }
}
