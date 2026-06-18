"use server"

import { TaskService } from "../services/task.service"
import type { TaskStatus } from "@/features/project/types/project.types"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<ActionResponse> {
  try {
    await TaskService.updateTaskStatus(taskId, status)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task status."
    return {
      success: false,
      error: message,
    }
  }
}
