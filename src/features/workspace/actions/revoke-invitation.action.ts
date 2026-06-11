"use server"

import { revalidatePath } from "next/cache"
import { InviteService } from "../services/invite.service"
import { requireUser } from "@/lib/supabase/server"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function revokeInvitationAction(invitationId: string): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to revoke invitations." }
    }

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
