"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FileIcon, Trash2, Download, FileText, Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface SharedAttachmentData {
  id?: string; // Optional for pending uploads
  fileName: string;
  filePath?: string; // Path in storage, if uploaded
  fileSize: number;
  mimeType: string;
  createdAt?: string; // Or uploaded_at
  uploadedBy?: string; // For permission checks
  signedUrl?: string; // If already fetched or public
  localUrl?: string; // For optimistic UI
}

interface SharedAttachmentCardProps {
  attachment: SharedAttachmentData;
  currentUserId?: string;
  onPreview?: (url: string) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function SharedAttachmentCard({ 
  attachment, 
  currentUserId, 
  onPreview, 
  onDelete, 
  isDeleting 
}: SharedAttachmentCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(attachment.signedUrl || attachment.localUrl || null);
  
  const isImage = attachment.mimeType.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";
  const supabase = createClient();

  useEffect(() => {
    // If we already have a URL (e.g. optimistic local URL or pre-fetched), don't fetch
    if (signedUrl || !attachment.filePath) return;

    let mounted = true;
    const fetchUrl = async () => {
      const { data } = await supabase.storage
        .from("attachments")
        .createSignedUrl(attachment.filePath!, 60 * 60); // 1 hour
      
      if (mounted && data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      }
    };
    fetchUrl();

    return () => { mounted = false; };
  }, [attachment.filePath, signedUrl, supabase]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.();
  };

  const ext = attachment.fileName.split(".").pop()?.toLowerCase() || "file";

  const getFileIcon = () => {
    if (isPdf) return <FileText size={32} />;
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return <Archive size={32} />;
    return <FileIcon size={32} />;
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return "Just now";
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
      className={`group relative h-[140px] flex flex-col bg-[#0f111a] border border-[#1e2333] rounded-xl overflow-hidden cursor-pointer transition-all hover:border-slate-700 hover:shadow-lg ${isDeleting ? "opacity-50 pointer-events-none" : ""} ${!onPreview ? "cursor-default" : ""}`}
      onClick={() => onPreview?.(signedUrl || "")}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      {/* Thumbnail Area */}
      <div className="relative flex-1 bg-[#0b0c13] flex items-center justify-center overflow-hidden">
        {isImage && signedUrl ? (
          <Image src={signedUrl} alt={attachment.fileName} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="text-slate-600 transition-transform duration-300 group-hover:scale-110">
            {getFileIcon()}
          </div>
        )}
      </div>

      {/* Menu Icon */}
      {(onDelete || signedUrl) && (
        <button 
          className={`absolute top-2 right-2 p-1.5 rounded-full z-10 transition-all ${isMenuOpen ? "bg-slate-800 text-white opacity-100" : "bg-slate-950/60 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-900 hover:text-white"}`}
          onClick={(e) => { 
            e.stopPropagation(); 
            setIsMenuOpen(!isMenuOpen); 
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      )}

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div 
          className="absolute top-9 right-2 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-20 flex flex-col animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Download size={14} /> Download
            </a>
          )}
          {onDelete && (!attachment.uploadedBy || currentUserId === attachment.uploadedBy) && (
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
        <span className="text-[11px] font-bold text-slate-200 truncate" title={attachment.fileName}>
          {attachment.fileName}
        </span>
        <span className="text-[9px] font-medium text-slate-500">
          {formatSize(attachment.fileSize)} • {timeAgo(attachment.createdAt)}
        </span>
      </div>
    </div>
  );
}
