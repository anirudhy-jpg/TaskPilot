"use server"

import { TaskService } from "../services/task.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function deleteTaskAction(
  taskId: string
): Promise<ActionResponse> {
  try {
    await TaskService.deleteTask(taskId)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete task."
    return {
      success: false,
      error: message,
    }
  }
}
