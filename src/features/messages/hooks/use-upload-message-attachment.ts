import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUploadMessageAttachment() {
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const uploadMessageAttachment = async (
    workspaceId: string,
    conversationId: string,
    file: File
  ) => {
    setIsUploading(true);
    try {
      // Validate file size
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("File size must be less than 25MB.");
      }

      // Validate allowed mime types
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedMimeTypes.includes(file.type)) {
        throw new Error("Unsupported file type.");
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `messages/${workspaceId}/${conversationId}/${crypto.randomUUID()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      return {
        path: filePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      };
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMessageAttachment = async (filePath: string) => {
    try {
      await supabase.storage.from("attachments").remove([filePath]);
    } catch (error) {
      console.error("Failed to cleanup attachment:", error);
    }
  };

  return { uploadMessageAttachment, deleteMessageAttachment, isUploading };
}
