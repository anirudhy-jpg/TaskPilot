"use server"

// Removed revalidatePath import
import { TaskService } from "../services/task.service"
import type { TaskPriority, Task } from "@/features/project/types/project.types"

export interface ActionResponse {
  success: boolean
  error?: string
  task?: Task
}

export async function createTaskAction(input: {
  projectId: string
  title: string
  description?: string
  columnId: string
  priority?: TaskPriority
  assigneeId?: string
}): Promise<ActionResponse> {
  try {
    const task = await TaskService.createTask(input)
    return { success: true, task }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create task."
    return {
      success: false,
      error: message,
    }
  }
}
