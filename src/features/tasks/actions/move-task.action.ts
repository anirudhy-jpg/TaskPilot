"use server"

import { revalidatePath } from "next/cache"
import { TaskService } from "../services/task.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function moveTaskAction(
  taskId: string,
  columnId: string,
  position: number
): Promise<ActionResponse> {
  try {
    await TaskService.moveTask(taskId, columnId, position)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to move task."
    return { success: false, error: message }
  }
}
