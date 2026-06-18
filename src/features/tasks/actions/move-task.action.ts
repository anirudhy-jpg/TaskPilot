"use server"

import { TaskService } from "../services/task.service"
import { MoveTaskSchema } from "@/lib/validations/task.schema"

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
    const result = MoveTaskSchema.safeParse({ columnId, position })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }

    await TaskService.moveTask(taskId, result.data.columnId, result.data.position)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to move task."
    return { success: false, error: message }
  }
}
