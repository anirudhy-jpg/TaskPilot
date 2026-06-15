"use server"

import { TaskService } from "../services/task.service"
import type { TaskPriority } from "@/features/project/types/project.types"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateTaskAction(
  taskId: string,
  updates: {
    title?: string
    description?: string | null
    priority?: TaskPriority
  }
): Promise<ActionResponse> {
  try {
    await TaskService.updateTask(taskId, updates)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task."
    return {
      success: false,
      error: message,
    }
  }
}
