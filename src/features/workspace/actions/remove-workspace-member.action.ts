"use server"

import { revalidatePath } from "next/cache"
import { MemberService } from "../services/member.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function removeWorkspaceMemberAction(
  workspaceId: string,
  memberId: string
): Promise<ActionResponse> {
  try {
    await MemberService.removeMember(workspaceId, memberId)
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
