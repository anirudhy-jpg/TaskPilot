"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "../services/workspace.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function renameWorkspaceAction(workspaceId: string, name: string): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to rename a workspace." }
    }

    await WorkspaceService.renameWorkspace(workspaceId, name, user.id)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to rename workspace."
    return {
      success: false,
      error: message,
    }
  }
}
