"use server"

import { requireUser } from "@/lib/supabase/server"

export async function deleteAttachmentAction(
  attachmentId: string,
  filePath: string,
  taskId: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser()

    const { error: storageError } = await supabase.storage
      .from("attachments")
      .remove([filePath])

    if (storageError) {
       console.error("Storage delete error:", storageError)
    }

    const { error: dbError } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", attachmentId)
      
    if (dbError) throw dbError

    await supabase.from("task_activities").insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: "ATTACHMENT_REMOVED",
      metadata: { file_name: fileName },
    })

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
