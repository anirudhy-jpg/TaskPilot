"use server"

import { revalidatePath } from "next/cache"
import { InviteService } from "../services/invite.service"
import { requireUser } from "@/lib/supabase/server"

export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

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
