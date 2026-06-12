"use server"

import { revalidatePath } from "next/cache"
import { TaskService } from "../services/task.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateTaskAssigneeAction(
  taskId: string,
  assigneeId: string | null
): Promise<ActionResponse> {
  try {
    await TaskService.updateTaskAssignee(taskId, assigneeId)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task assignee."
    return {
      success: false,
      error: message,
    }
  }
}
