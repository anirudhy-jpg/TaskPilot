import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadAttachmentAction } from "../actions/upload-attachment.action";

export function useUploadAttachment(taskId: string) {
  const [isPending, setIsPending] = useState(false);
  const supabase = createClient();

  const mutate = async ({ file }: { file: File }) => {
    setIsPending(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${taskId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { success, data, error: actionError } = await uploadAttachmentAction({
        taskId,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      });

      if (!success) throw new Error(actionError || "Failed to save attachment metadata");
      
      window.dispatchEvent(new CustomEvent("refetch-attachments", { detail: { taskId } }));
      return data;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}
