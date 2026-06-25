"use client";

import React, { useState } from "react";
import { useTaskAttachments } from "../hooks/use-task-attachments";
import { AttachmentItem } from "./AttachmentItem";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import type { TaskAttachment } from "../types/attachment";

export function AttachmentList({ taskId, currentUserId }: { taskId: string; currentUserId?: string }) {
  const { data: attachments, isLoading, error } = useTaskAttachments(taskId);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);

  if (isLoading) {
    return <div className="text-[11px] text-slate-500 mt-2 animate-pulse">Loading attachments...</div>;
  }

  if (error) {
    return <div className="text-[11px] text-rose-500 mt-2">Failed to load attachments</div>;
  }

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handlePreview = (attachment: TaskAttachment) => {
    setPreviewAttachment(attachment);
  };

  const getFileUrl = (attachment: TaskAttachment | null) => {
    if (!attachment) return "";
    return attachment.signed_url || "";
  };

  return (
    <>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
        {attachments.map((attachment) => (
          <AttachmentItem 
            key={attachment.id} 
            attachment={attachment} 
            currentUserId={currentUserId} 
            onPreview={() => handlePreview(attachment)}
          />
        ))}
      </div>

      {previewAttachment && (
        <AttachmentPreviewModal 
          fileName={previewAttachment.file_name}
          fileSize={previewAttachment.file_size}
          mimeType={previewAttachment.mime_type}
          fileUrl={getFileUrl(previewAttachment)}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </>
  );
}
