"use server"

import { TaskService } from "../services/task.service"
import { UpdateTaskSchema, type UpdateTaskInput } from "@/lib/validations/task.schema"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateTaskAction(
  taskId: string,
  updates: UpdateTaskInput
): Promise<ActionResponse> {
  try {
    const result = UpdateTaskSchema.safeParse(updates)
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }

    await TaskService.updateTask(taskId, result.data)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task."
    return {
      success: false,
      error: message,
    }
  }
}
