"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "../services/workspace.service"

export interface ActionResponse {
  success: boolean
  error?: string
  workspaceId?: string
}

export async function createWorkspaceAction(
  name: string
): Promise<ActionResponse> {
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
