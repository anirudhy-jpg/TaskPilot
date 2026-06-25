import React, { useState } from "react"
import { Pencil, Trash2, MoreHorizontal, AlertCircle, RefreshCw } from "lucide-react"
import type { Message } from "../types"
import { Avatar } from "@/components/ui/avatar"
import { SharedAttachmentCard } from "@/features/attachments/components/shared-attachment-card"
import { AttachmentPreviewModal } from "@/features/attachments/components/AttachmentPreviewModal"

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isReadOnly: boolean
  isEditing?: boolean
  onSetEditing?: (isEditing: boolean) => void
  onEdit: (id: string, newContent: string) => void
  onDelete: (id: string) => void
  onRetry?: (id: string) => void
}

export function MessageBubble({ message, isOwn, isReadOnly, isEditing: externalIsEditing, onSetEditing, onEdit, onDelete, onRetry }: MessageBubbleProps) {
  const [localIsEditing, setLocalIsEditing] = React.useState(false)
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : localIsEditing
  
  const setIsEditing = React.useCallback((val: boolean) => {
    if (onSetEditing) onSetEditing(val)
    else setLocalIsEditing(val)
  }, [onSetEditing])

  const [editContent, setEditContent] = React.useState(message.content)
  const [showOptions, setShowOptions] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  // Reset content when entering edit mode
  React.useEffect(() => {
    if (isEditing) setEditContent(message.content)
  }, [isEditing, message.content])

  const handleSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent)
    }
    setIsEditing(false)
  }

  if (message.deletedAt) {
    return (
      <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl px-4 py-2 italic text-slate-500 text-xs font-medium">
          This message was deleted
        </div>
      </div>
    )
  }

  const isPending = message.status === "pending"
  const isError = message.status === "error"

  const hasAttachment = !!(message.attachmentName || message.attachmentPath);
  const attachmentData = hasAttachment ? {
    fileName: message.attachmentName || "Unknown File",
    filePath: message.attachmentPath,
    fileSize: message.attachmentSize || 0,
    mimeType: message.attachmentMimeType || "application/octet-stream",
    createdAt: message.attachmentUploadedAt || message.createdAt,
    uploadedBy: message.senderId,
  } : null;

  return (
    <div className={`flex w-full group ${isOwn ? "justify-end" : "justify-start"} mb-8 transition-opacity duration-200 ${isPending ? "opacity-70" : ""}`}>
      <div className={`flex items-start gap-3 w-full ${isOwn ? "flex-row-reverse" : "flex-row"} max-w-[75%]`}>
        {/* Avatar aligned to top */}
        <div className="shrink-0 mt-6">
          <Avatar user={message.sender as any} className="w-8 h-8 shadow-sm" />
        </div>
        
        <div className={`flex flex-col min-w-0 ${isOwn ? "items-end" : "items-start"} max-w-full relative`}>
          {/* Sender Name */}
          <span className="text-[11px] font-bold text-slate-500 mb-1 px-1">
            {message.sender?.fullName || message.sender?.email || "User"}
          </span>

          {/* Timestamp above bubble */}
          <div className="mb-1.5 px-1">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              {new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {message.editedAt && " (edited)"}
            </span>
          </div>
          
          <div className={`relative group/bubble max-w-full`}>
            {/* Absolute positioned Action Buttons */}
            {isOwn && !isReadOnly && !isEditing && (
              <div className="absolute -top-10 right-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 bg-[#121826] border border-slate-700/50 rounded-lg p-1 shadow-xl z-20">
                <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded-md transition-colors" title="Edit message">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(message.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-md transition-colors" title="Delete message">
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            <div className={`shadow-md relative flex flex-col min-w-[60px] max-w-full ${
              isEditing 
                ? "bg-transparent p-0" 
                : isOwn 
                  ? "px-4 py-3 bg-amber-500 text-slate-950 rounded-2xl rounded-tr-sm shadow-amber-500/10" 
                  : "px-4 py-3 bg-[#182132] text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700/30"
            }`}>
              {isEditing ? (
                <div className="flex flex-col gap-2 min-w-[250px] w-[400px] max-w-full">
                  <textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-[#121826] text-slate-200 placeholder-slate-500 border border-amber-500 rounded-xl p-3 text-[15px] font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none shadow-sm"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSave();
                      } else if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditContent(message.content);
                      }
                    }}
                  />
                  <div className="flex justify-start items-center gap-2">
                    <button onClick={handleSave} className="text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 px-4 py-1.5 rounded-full transition-all shadow-sm">Save</button>
                    <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="text-[13px] font-bold text-slate-200 bg-[#1e293b] hover:bg-[#334155] px-4 py-1.5 rounded-full transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-w-full">
                  {attachmentData && (
                    <div className="w-64 max-w-full">
                      <SharedAttachmentCard 
                        attachment={attachmentData}
                        onPreview={(url) => {
                          if (url) setPreviewUrl(url);
                        }}
                      />
                    </div>
                  )}
                  {message.content && (
                    <p className="text-[15px] whitespace-pre-wrap break-words font-medium leading-relaxed max-w-full" style={{ wordBreak: 'break-word' }}>{message.content}</p>
                  )}
                </div>
              )}
            </div>
            
            {isError && onRetry && (
               <div className="absolute -bottom-6 right-0 flex items-center gap-2 text-rose-500 text-[10px] font-bold">
                 <AlertCircle size={12} />
                 <span>Failed to send</span>
                 <button onClick={() => onRetry(message.id)} className="flex items-center gap-1 hover:text-rose-400">
                   <RefreshCw size={10} /> Retry
                 </button>
               </div>
            )}
          </div>
        </div>
      </div>
      
      {previewUrl && attachmentData && (
        <AttachmentPreviewModal 
          fileName={attachmentData.fileName}
          fileSize={attachmentData.fileSize}
          mimeType={attachmentData.mimeType}
          fileUrl={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  )
}
