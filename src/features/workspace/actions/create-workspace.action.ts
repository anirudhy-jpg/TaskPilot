"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "../services/workspace.service"
import { WorkspaceHubService } from "../services/workspace-hub.service"
import { CreateWorkspaceSchema } from "@/lib/validations/workspace.schema"

export interface ActionResponse {
  success: boolean
  error?: string
  workspaceId?: string
}

export async function createWorkspaceAction(
  name: string
): Promise<ActionResponse> {
  try {
    const result = CreateWorkspaceSchema.safeParse({ name })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }
    const validatedName = result.data.name;

    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to create a workspace." }
    }

    // Block users from creating new workspaces if they already belong to one
    const workspaces = await WorkspaceHubService.getWorkspacesForUser(user.id)
    if (workspaces.length > 0) {
      return { success: false, error: "Users are restricted to a single workspace per account." }
    }

    const ws = await WorkspaceService.createWorkspace(validatedName, user.id)

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
