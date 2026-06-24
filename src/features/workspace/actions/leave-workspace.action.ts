"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceHubService } from "../services/workspace-hub.service"

export interface ActionResponse {
  success: boolean
  error?: string
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

    // Validate if the leaving user's timer is now invalid
    const { TimeTrackingService } = await import("@/features/time-tracking/services/time-tracking.service")
    await TimeTrackingService.validateAndStopInvalidActiveTimers(user.id)

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
