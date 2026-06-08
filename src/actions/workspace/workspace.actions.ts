"use server"

import { revalidatePath } from "next/cache"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import { MemberService } from "@/services/member.service"
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
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create project."
    return {
      success: false,
      error: message,
    }
  }
}

export async function deleteProjectAction(
  projectId: string
): Promise<ActionResponse> {
  try {
    await ProjectService.deleteProject(projectId)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete project."
    return {
      success: false,
      error: message,
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

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<ActionResponse> {
  try {
    await TaskService.updateTaskStatus(taskId, status)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task."
    return {
      success: false,
      error: message,
    }
  }
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

export async function removeWorkspaceMemberAction(
  workspaceId: string,
  memberId: string
): Promise<ActionResponse> {
  try {
    await MemberService.removeMember(workspaceId, memberId)
    revalidatePath("/members")
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove workspace member."
    return {
      success: false,
      error: message,
    }
  }
}

