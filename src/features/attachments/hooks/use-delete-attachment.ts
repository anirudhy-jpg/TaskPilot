import { useState } from "react";
import { deleteAttachmentAction } from "../actions/delete-attachment.action";

export function useDeleteAttachment(taskId: string) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (
    { attachmentId, filePath, fileName }: { attachmentId: string; filePath: string; fileName: string },
    options?: { onSettled?: () => void }
  ) => {
    setIsPending(true);
    try {
      const { success, error } = await deleteAttachmentAction(attachmentId, filePath, taskId, fileName);
      if (!success) throw new Error(error || "Failed to delete attachment");
      window.dispatchEvent(new CustomEvent("refetch-attachments", { detail: { taskId } }));
    } finally {
      setIsPending(false);
      options?.onSettled?.();
    }
  };

  return { mutate, isPending };
}
