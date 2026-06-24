"use server"

import { revalidatePath } from "next/cache"
import { MemberService } from "../services/member.service"
import { requireUser } from "@/lib/supabase/server"


export interface ActionResponse {
  success: boolean
  error?: string
}

export async function removeWorkspaceMemberAction(
  workspaceId: string,
  memberId: string
): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    await MemberService.removeMember(workspaceId, memberId, user.id)
    
    // Validate if the removed user's timer is now invalid
    const { TimeTrackingService } = await import("@/features/time-tracking/services/time-tracking.service")
    await TimeTrackingService.validateAndStopInvalidActiveTimers(memberId)

    revalidatePath("/members")
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove workspace member."
    return {
      success: false,
      error: message,
    }
  }
}
