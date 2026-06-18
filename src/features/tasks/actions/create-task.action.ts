"use server"

// Removed revalidatePath import
import { TaskService } from "../services/task.service"
import type { Task } from "@/features/project/types/project.types"
import { CreateTaskSchema, type CreateTaskInput } from "@/lib/validations/task.schema"

export interface ActionResponse {
  success: boolean
  error?: string
  task?: Task
}

export async function createTaskAction(
  input: CreateTaskInput
): Promise<ActionResponse> {
  try {
    const result = CreateTaskSchema.safeParse(input)
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }
    
    const task = await TaskService.createTask(result.data)
    return { success: true, task }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create task."
    return {
      success: false,
      error: message,
    }
  }
}
