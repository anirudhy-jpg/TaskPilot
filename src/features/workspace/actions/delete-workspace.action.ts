"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "../services/workspace.service"

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
