"use server"

import { revalidatePath } from "next/cache"
import { InviteService } from "@/services/invite.service"
import { requireUser } from "@/lib/supabase/server"

export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server action for a member.
 */
export async function createInvitationAction(
  workspaceId: string,
  email: string,
  role: "admin" | "member",
  projectId?: string | null
): Promise<ActionResponse<string>> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to invite members." }
    }

    const inviteUrl = await InviteService.createInvitation(
      workspaceId,
      email,
      role,
      user.id,
      projectId
    )

    revalidatePath("/members")
    return { success: true, data: inviteUrl }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create invitation."
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Server action to accept a workspace invitation.
 */
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

/**
 * Server action to decline a workspace invitation.
 */
export async function declineInvitationAction(token: string): Promise<ActionResponse> {
  try {
    await InviteService.declineInvitation(token)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to decline invitation."
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Server action to revoke (delete) a pending invitation.
 */
export async function revokeInvitationAction(invitationId: string): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to revoke invitations." }
    }

    // InviteService.revokeInvitation will handle deleting it
    await InviteService.revokeInvitation(invitationId)

    revalidatePath("/members")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to revoke invitation."
    return {
      success: false,
      error: message,
    }
  }
}
