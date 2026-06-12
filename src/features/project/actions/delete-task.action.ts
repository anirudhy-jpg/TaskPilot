"use server"

import { revalidatePath } from "next/cache"
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
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete task."
    return {
      success: false,
      error: message,
    }
  }
}
