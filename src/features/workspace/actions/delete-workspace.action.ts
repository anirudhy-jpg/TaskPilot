"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "../services/workspace.service"
import { WorkspaceHubService } from "../services/workspace-hub.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to delete a workspace." }
    }

    // Block workspace owners from deleting workspaces
    const workspaces = await WorkspaceHubService.getWorkspacesForUser(user.id)
    const workspace = workspaces.find((w) => w.id === workspaceId)
    if (workspace && workspace.ownerId === user.id) {
      return { success: false, error: "Workspace owners are not allowed to delete workspaces." }
    }

    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    // 1. Find all users with an active timer in this workspace
    const { data: activeTimers } = await supabase
      .from("time_entries")
      .select(`
        user_id,
        task:tasks!inner(
          project:projects!inner(workspace_id)
        )
      `)
      .eq("task.project.workspace_id", workspaceId)
      .is("end_time", null)

    // 2. Stop those timers before cascade-deletion
    if (activeTimers && activeTimers.length > 0) {
      const { TimeTrackingService } = await import("@/features/time-tracking/services/time-tracking.service")
      for (const timer of activeTimers) {
        await TimeTrackingService.validateAndStopInvalidActiveTimers(
          timer.user_id, 
          "System automatically stopped timer because the workspace was deleted."
        )
      }
    }

    // 3. Delete the workspace
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
