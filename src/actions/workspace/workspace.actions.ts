"use server"

import { revalidatePath } from "next/cache"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import { MemberService } from "@/services/member.service"
import { requireUser, createClient } from "@/lib/supabase/server"
import { WorkspaceService } from "@/services/workspace.service"
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

export async function addProjectMemberAction(
  projectId: string,
  userId: string
): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const supabase = await createClient()

    // 1. Get project to check workspace ID
    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .maybeSingle()

    if (!project) {
      return { success: false, error: "Project not found" }
    }

    // 2. Verify that current user is the owner of this workspace
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", project.workspace_id)
      .maybeSingle()

    if (!ws || ws.owner_id !== user.id) {
      return { success: false, error: "Unauthorized: Only the workspace owner can add members to projects." }
    }

    // 3. Verify target user is indeed a member of this workspace
    const { data: isMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", userId)
      .maybeSingle()

    if (!isMember) {
      return { success: false, error: "This user is not a member of the workspace." }
    }

    // 4. Insert project member
    const { error: insertErr } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: userId,
        role: "member"
      })

    if (insertErr) {
      if (insertErr.code === "23505") {
        return { success: false, error: "User is already assigned to this project." }
      }
      throw insertErr
    }

    revalidatePath("/projects", "layout")
    revalidatePath("/workspace")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add member to project."
    return { success: false, error: message }
  }
}

export async function removeProjectMemberAction(
  projectId: string,
  userId: string
): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const supabase = await createClient()

    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .maybeSingle()

    if (!project) {
      return { success: false, error: "Project not found" }
    }

    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", project.workspace_id)
      .maybeSingle()

    if (!ws || ws.owner_id !== user.id) {
      return { success: false, error: "Unauthorized: Only the workspace owner can remove members from projects." }
    }

    const { error: deleteErr } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId)

    if (deleteErr) throw deleteErr

    revalidatePath("/projects", "layout")
    revalidatePath("/workspace")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove member from project."
    return { success: false, error: message }
  }
}
