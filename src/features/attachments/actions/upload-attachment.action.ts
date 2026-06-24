"use server"

import { requireUser } from "@/lib/supabase/server"
import type { UploadAttachmentPayload, TaskAttachment } from "../types/attachment"

export async function uploadAttachmentAction(
  payload: UploadAttachmentPayload
): Promise<{ success: boolean; data?: TaskAttachment; error?: string }> {
  try {
    const { supabase, user } = await requireUser()

    const { data, error } = await supabase
      .from("task_attachments")
      .insert({
        task_id: payload.taskId,
        uploaded_by: user.id,
        file_name: payload.fileName,
        file_path: payload.filePath,
        file_size: payload.fileSize,
        mime_type: payload.mimeType,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from("task_activities").insert({
      task_id: payload.taskId,
      actor_id: user.id,
      action_type: "ATTACHMENT_ADDED",
      metadata: { file_name: payload.fileName },
    })

    return { success: true, data: data as TaskAttachment }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
