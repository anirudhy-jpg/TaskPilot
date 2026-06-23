"use client";

import React, { useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useUploadAttachment } from "../hooks/use-upload-attachment";

export function AttachmentUpload({ taskId }: { taskId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, isPending } = useUploadAttachment(taskId);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const file = files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("File size must be less than 20MB.");
        return;
      }
      upload({ file });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => !isPending && fileInputRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:bg-slate-800 rounded-md text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
        title="Add attachment"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Add Attachment
      </button>
    </>
  );
}
