"use server"

import { revalidatePath } from "next/cache"
import { InviteService } from "../services/invite.service"
import { requireUser } from "@/lib/supabase/server"

export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export async function acceptInvitationAction(token: string): Promise<ActionResponse<string>> {
  try {
    const { user } = await requireUser()
    if (!user || !user.email) {
      return { success: false, error: "You must be authenticated to accept this invitation." }
    }

    const workspaceId = await InviteService.acceptInvitation(token, user.id, user.email)

    // Set active workspace cookie
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      cookieStore.set("active_workspace_id", workspaceId, { path: "/" })
    } catch (cookieErr) {
      console.error("Failed to set active_workspace_id cookie:", cookieErr)
    }

    revalidatePath("/workspace")
    revalidatePath("/members")
    return { success: true, data: workspaceId }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to accept invitation."
    return {
      success: false,
      error: message,
    }
  }
}
