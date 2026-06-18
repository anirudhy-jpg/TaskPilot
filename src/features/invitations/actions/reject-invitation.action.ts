"use server"

import { InviteService } from "../services/invite.service";
import { requireUser } from "@/lib/supabase/server";

export interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * Server action to decline/reject a workspace invitation.
 */
export async function rejectInvitationAction(token: string): Promise<ActionResponse> {
  try {
    const { user } = await requireUser();
    if (!user || !user.email) {
      return { success: false, error: "You must be authenticated to decline this invitation." };
    }

    await InviteService.rejectInvitation(token, user.id, user.email);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to decline invitation.";
    return {
      success: false,
      error: message,
    };
  }
}
