"use server"

// Removed revalidatePath import
import { TaskTimelineService } from "../services/task-timeline.service"
import { UpdateCommentSchema } from "@/lib/validations/task.schema"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateCommentAction(
  commentId: string, 
  content: string
): Promise<ActionResponse> {
  try {
    const result = UpdateCommentSchema.safeParse({ content })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }

    await TaskTimelineService.editComment(commentId, result.data.content)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update comment."
    return {
      success: false,
      error: message,
    }
  }
}
