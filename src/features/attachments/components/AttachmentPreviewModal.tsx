"use client";

import React, { useEffect } from "react";
import { X, Download, FileText } from "lucide-react";
import type { TaskAttachment } from "../types/attachment";

interface AttachmentPreviewModalProps {
  attachment: TaskAttachment;
  fileUrl: string;
  onClose: () => void;
}

export function AttachmentPreviewModal({ attachment, fileUrl, onClose }: AttachmentPreviewModalProps) {
  const isImage = attachment.mime_type.startsWith("image/");
  const isPdf = attachment.mime_type === "application/pdf";

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-950/80 to-transparent flex items-center justify-between px-6 z-10 pointer-events-none">
        <div className="flex flex-col min-w-0 drop-shadow-md pointer-events-auto">
          <span className="text-sm font-bold text-slate-200 truncate">{attachment.file_name}</span>
          <span className="text-[10px] text-slate-400 font-medium">
            {(attachment.file_size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          <a
            href={fileUrl}
            download
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors shadow-lg"
            title="Download file"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onClose}
            className="p-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded-lg transition-colors shadow-lg"
            title="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div 
        className="w-full h-full p-4 md:p-12 flex items-center justify-center pt-20"
        onClick={onClose} // Clicking backdrop closes
      >
        <div 
          className="relative max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl flex items-center justify-center bg-slate-900/50"
          onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to backdrop
          style={isPdf ? { width: '80vw', height: '85vh' } : undefined}
        >
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={fileUrl} 
              alt={attachment.file_name} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          ) : isPdf ? (
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="w-full h-full border-0 bg-white rounded-lg"
              title={attachment.file_name}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 p-12 text-slate-400">
              <FileText size={64} className="opacity-50" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-200 mb-1">Preview Unavailable</h3>
                <p className="text-sm text-slate-500 mb-6">This file type cannot be previewed in the browser.</p>
                <a
                  href={fileUrl}
                  download
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors inline-flex items-center gap-2 shadow-lg"
                >
                  <Download size={16} />
                  Download to View
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
