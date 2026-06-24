"use server"

import { requireUser } from "@/lib/supabase/server"
import type { TaskAttachment } from "../types/attachment"

export async function getTaskAttachmentsAction(
  taskId: string
): Promise<{ success: boolean; data?: TaskAttachment[]; error?: string }> {
  try {
    const { supabase } = await requireUser()

    const { data, error } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Generate signed URLs for all attachments
    const attachmentsWithUrls = await Promise.all(
      data.map(async (attachment) => {
        const { data: urlData } = await supabase.storage
          .from("attachments")
          .createSignedUrl(attachment.file_path, 60 * 60); // 1 hour expiry
          
        return {
          ...attachment,
          signed_url: urlData?.signedUrl || null
        };
      })
    );

    return { success: true, data: attachmentsWithUrls as TaskAttachment[] }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
