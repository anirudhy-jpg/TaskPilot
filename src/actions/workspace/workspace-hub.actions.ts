"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/services/workspace.service"
import { WorkspaceHubService } from "@/services/workspace-hub.service"
import type { ActionResponse } from "@/actions/workspace/workspace.actions"

export async function switchActiveWorkspaceAction(
  workspaceId: string
): Promise<ActionResponse> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    cookieStore.set("active_workspace_id", workspaceId, { path: "/" })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to switch active workspace."
    return {
      success: false,
      error: message,
    }
  }
}

export async function createWorkspaceAction(
  name: string
): Promise<ActionResponse & { workspaceId?: string }> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to create a workspace." }
    }

    const ws = await WorkspaceService.createWorkspace(name, user.id)

    // Auto-set the active workspace id to the newly created one!
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    cookieStore.set("active_workspace_id", ws.id, { path: "/" })

    revalidatePath("/", "layout")
    return { success: true, workspaceId: ws.id }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create workspace."
    return {
      success: false,
      error: message,
    }
  }
}

export async function leaveWorkspaceAction(workspaceId: string): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to leave a workspace." }
    }

    await WorkspaceHubService.leaveWorkspace(workspaceId, user.id)

    // Clear active workspace cookie since user has left it
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    cookieStore.delete("active_workspace_id")

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to leave workspace."
    return {
      success: false,
      error: message,
    }
  }
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to delete a workspace." }
    }

    await WorkspaceService.deleteWorkspace(workspaceId, user.id)

    // Clear active workspace cookie
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    cookieStore.delete("active_workspace_id")

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete workspace."
    return {
      success: false,
      error: message,
    }
  }
}
