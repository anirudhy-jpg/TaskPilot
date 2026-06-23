"use client";

import React, { useState } from "react";
import { FileIcon, Trash2, Download, FileText, Archive } from "lucide-react";
import type { TaskAttachment } from "../types/attachment";
import { useDeleteAttachment } from "../hooks/use-delete-attachment";
import { DeleteConfirmModal } from "@/features/project/components/modals/delete-confirm-modal";

interface AttachmentItemProps {
  attachment: TaskAttachment;
  currentUserId?: string;
  onPreview: () => void;
}

export function AttachmentItem({ attachment, currentUserId, onPreview }: AttachmentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutate: deleteAttachment } = useDeleteAttachment(attachment.task_id);
  const isImage = attachment.mime_type.startsWith("image/");
  const isPdf = attachment.mime_type === "application/pdf";
  const fileUrl = attachment.signed_url || "";

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
    setIsMenuOpen(false);
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

  const ext = attachment.file_name.split(".").pop()?.toLowerCase() || "file";

  const getFileIcon = () => {
    if (isPdf) return <FileText size={32} />;
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return <Archive size={32} />;
    return <FileIcon size={32} />;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div 
      className={`group relative h-[140px] flex flex-col bg-[#0f111a] border border-[#1e2333] rounded-xl overflow-hidden cursor-pointer transition-all hover:border-slate-700 hover:shadow-lg ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
      onClick={onPreview}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      {/* Thumbnail Area */}
      <div className="relative flex-1 bg-[#0b0c13] flex items-center justify-center overflow-hidden">
        {isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={fileUrl} alt={attachment.file_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="text-slate-600 transition-transform duration-300 group-hover:scale-110">
            {getFileIcon()}
          </div>
        )}
      </div>

      {/* Menu Icon */}
      <button 
        className={`absolute top-2 right-2 p-1.5 rounded-full z-10 transition-all ${isMenuOpen ? "bg-slate-800 text-white opacity-100" : "bg-slate-950/60 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-900 hover:text-white"}`}
        onClick={(e) => { 
          e.stopPropagation(); 
          setIsMenuOpen(!isMenuOpen); 
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div 
          className="absolute top-9 right-2 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-20 flex flex-col animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            download
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Download size={14} /> Download
          </a>
          {(currentUserId === attachment.uploaded_by || !currentUserId) && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer w-full text-left"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}

      {/* Bottom Info Bar */}
      <div className="shrink-0 p-3 flex flex-col gap-1 bg-[#0f111a] border-t border-[#1e2333] z-10 relative">
        <span className="text-[11px] font-bold text-slate-200 truncate" title={attachment.file_name}>
          {attachment.file_name}
        </span>
        <span className="text-[9px] font-medium text-slate-500">
          {formatSize(attachment.file_size)} • {timeAgo(attachment.created_at)}
        </span>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        type="attachment"
        name={attachment.file_name}
        isPending={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
