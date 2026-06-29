"use client";

import React, { useState } from "react";
import type { TaskAttachment } from "../types/attachment";
import { SharedAttachmentCard } from "./shared-attachment-card";
import { useDeleteAttachment } from "../hooks/use-delete-attachment";
import { DeleteConfirmModal } from "@/features/project/components/modals/delete-confirm-modal";

interface AttachmentItemProps {
  attachment: TaskAttachment;
  currentUserId?: string;
  onPreview: () => void;
}

export function AttachmentItem({ attachment, currentUserId, onPreview }: AttachmentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutate: deleteAttachment } = useDeleteAttachment(attachment.task_id);

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    setIsDeleting(true);
    deleteAttachment(
      { attachmentId: attachment.id, filePath: attachment.file_path, fileName: attachment.file_name },
      { onSettled: () => {
          setIsDeleting(false);
          setIsDeleteDialogOpen(false);
        }
      }
    );
  };

  const attachmentData = {
    id: attachment.id,
    fileName: attachment.file_name,
    filePath: attachment.file_path,
    fileSize: attachment.file_size,
    mimeType: attachment.mime_type,
    createdAt: attachment.created_at,
    uploadedBy: attachment.uploaded_by,
    signedUrl: attachment.signed_url || undefined,
  };

  return (
    <>
      <SharedAttachmentCard 
        attachment={attachmentData}
        currentUserId={currentUserId}
        onPreview={onPreview}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
      <DeleteConfirmModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        type="attachment"
        name={attachment.file_name}
        isPending={isDeleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
