"use server"

import { revalidatePath } from "next/cache"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import type { TaskStatus, TaskPriority } from "@/types/workspace.types"

export interface ActionResponse {
  success: boolean
  error?: string
}

// ─── Project Actions ─────────────────────────────────────────

export async function createProjectAction(
  workspaceId: string,
  name: string,
  description?: string
): Promise<ActionResponse> {
  try {
    await ProjectService.createProject(workspaceId, name, description)
    revalidatePath("/workspace")
    revalidatePath("/projects")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create project.",
    }
  }
}

export async function deleteProjectAction(
  projectId: string
): Promise<ActionResponse> {
  try {
    await ProjectService.deleteProject(projectId)
    revalidatePath("/workspace")
    revalidatePath("/projects")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete project.",
    }
  }
}

// ─── Task Actions ────────────────────────────────────────────

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
    revalidatePath("/projects")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create task.",
    }
  }
}

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<ActionResponse> {
  try {
    await TaskService.updateTaskStatus(taskId, status)
    revalidatePath("/workspace")
    revalidatePath("/projects")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update task.",
    }
  }
}

export async function deleteTaskAction(
  taskId: string
): Promise<ActionResponse> {
  try {
    await TaskService.deleteTask(taskId)
    revalidatePath("/workspace")
    revalidatePath("/projects")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete task.",
    }
  }
}
