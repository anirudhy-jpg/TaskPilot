"use server"

import { revalidatePath } from "next/cache"
import { TaskService } from "../services/task.service"
import type { TaskStatus, TaskPriority } from "../types/project.types"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function createTaskAction(input: {
  projectId: string
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
}): Promise<ActionResponse> {
  try {
    await TaskService.createTask(input)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create task."
    return {
      success: false,
      error: message,
    }
  }
}
