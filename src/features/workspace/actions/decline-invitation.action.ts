"use server"

import { InviteService } from "../services/invite.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

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
