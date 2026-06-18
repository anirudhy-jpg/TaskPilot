"use server"

// Removed revalidatePath import
import { TaskTimelineService } from "../services/task-timeline.service"
import type { TaskComment } from "@/features/project/types/project.types"
import { AddCommentSchema } from "@/lib/validations/task.schema"

export interface ActionResponse {
  success: boolean
  error?: string
  comment?: TaskComment
}

export async function addCommentAction(
  taskId: string, 
  content: string, 
  mentionedUserIds: string[] = []
): Promise<ActionResponse> {
  try {
    const result = AddCommentSchema.safeParse({ content, mentionedUserIds })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }

    const comment = await TaskTimelineService.addComment(taskId, result.data.content, result.data.mentionedUserIds)
    return { success: true, comment }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add comment."
    return {
      success: false,
      error: message,
    }
  }
}
