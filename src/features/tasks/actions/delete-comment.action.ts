"use server"

import { revalidatePath } from "next/cache"
import { TaskTimelineService } from "../services/task-timeline.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function deleteCommentAction(
  commentId: string
): Promise<ActionResponse> {
  try {
    await TaskTimelineService.deleteComment(commentId)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete comment."
    return {
      success: false,
      error: message,
    }
  }
}
