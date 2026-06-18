"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "../services/workspace.service"
import { RenameWorkspaceSchema } from "@/lib/validations/workspace.schema"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function renameWorkspaceAction(workspaceId: string, name: string): Promise<ActionResponse> {
  try {
    const result = RenameWorkspaceSchema.safeParse({ name })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }
    const validatedName = result.data.name;

    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to rename a workspace." }
    }

    await WorkspaceService.renameWorkspace(workspaceId, validatedName, user.id)
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
