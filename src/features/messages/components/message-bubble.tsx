import React, { useState } from "react"
import { Pencil, Trash2, MoreHorizontal, AlertCircle, RefreshCw, Reply, SmilePlus, Copy, Check } from "lucide-react"
import type { Message, MessageReaction } from "../types"
import { EmojiPicker } from "./emoji-picker"
import { Avatar } from "@/components/ui/avatar"
import { SharedAttachmentCard } from "@/features/attachments/components/shared-attachment-card"
import { AttachmentPreviewModal } from "@/features/attachments/components/AttachmentPreviewModal"
import { DeleteConfirmModal } from "@/features/project/components/modals/delete-confirm-modal"

const formatTextWithLinks = (text: string, isOwn: boolean) => {
  if (!text) return null;
  const URL_REGEX = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, i) => {
    if (part.match(/^https?:\/\//)) {
      // Remove trailing punctuation often added by mistake
      const cleanUrl = part.replace(/[.,;:]+$/, '');
      const trailingPunctuation = part.slice(cleanUrl.length);
      
      return (
        <React.Fragment key={i}>
          <a 
            href={cleanUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`underline break-words transition-colors ${
              isOwn 
                ? "text-slate-900 hover:text-slate-700 font-semibold" 
                : "text-amber-500 hover:text-amber-400 font-medium"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {cleanUrl}
          </a>
          {trailingPunctuation}
        </React.Fragment>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};
interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isReadOnly: boolean
  isEditing?: boolean
  onSetEditing?: (isEditing: boolean) => void
  onEdit: (id: string, newContent: string) => void
  onDelete: (id: string) => void
  onRetry?: (id: string) => void
  onReplyClick?: () => void
  onReplyPreviewClick?: (id: string) => void
  currentUserId: string
  onToggleReaction?: (messageId: string, emoji: string) => void
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮"];

export function MessageBubble({ message, isOwn, isReadOnly, isEditing: externalIsEditing, onSetEditing, onEdit, onDelete, onRetry, onReplyClick, onReplyPreviewClick, currentUserId, onToggleReaction }: MessageBubbleProps) {
  const [localIsEditing, setLocalIsEditing] = React.useState(false)
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : localIsEditing
  
  const setIsEditing = React.useCallback((val: boolean) => {
    if (onSetEditing) onSetEditing(val)
    else setLocalIsEditing(val)
  }, [onSetEditing])

  const [editContent, setEditContent] = React.useState(message.content)
  const [showOptions, setShowOptions] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }

  const handleDeleteConfirm = () => {
    setIsDeleting(true);
    onDelete(message.id);
    setShowDeleteModal(false);
  }

  // Group reactions
  const reactionGroups = React.useMemo(() => {
    if (!message.reactions) return [];
    const groups = new Map<string, { emoji: string, count: number, users: string[], hasReacted: boolean }>();
    
    message.reactions.forEach(r => {
      const existing = groups.get(r.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(r.userId);
        if (r.userId === currentUserId) existing.hasReacted = true;
      } else {
        groups.set(r.emoji, {
          emoji: r.emoji,
          count: 1,
          users: [r.userId],
          hasReacted: r.userId === currentUserId
        });
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [message.reactions, currentUserId]);

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
      <div id={`message-${message.id}`} className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
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
    <div id={`message-${message.id}`} className={`flex w-full group ${isOwn ? "justify-end" : "justify-start"} mb-8 transition-opacity duration-200 ${isPending ? "opacity-70" : ""}`}>
      <div className={`flex items-start gap-3 w-full ${isOwn ? "flex-row-reverse" : "flex-row"} max-w-[75%]`}>
        {/* Avatar aligned to top */}
        <div className="shrink-0 mt-1">
          <Avatar user={message.sender as any} className="w-8 h-8 shadow-sm" />
        </div>
        
        <div className={`flex flex-col min-w-0 ${isOwn ? "items-end" : "items-start"} max-w-full relative`}>
          <div className={`relative group/bubble max-w-full`}>
            {/* Absolute positioned Action Buttons */}
            {!isReadOnly && !isEditing && (
              <div className={`absolute -top-10 ${isOwn ? "right-0" : "left-0"} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-0.5 bg-[#121826] border border-slate-700/50 rounded-lg p-1 shadow-xl z-20`}>
                {!isReadOnly && onToggleReaction && (
                  <div className="flex items-center">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(message.id, emoji)}
                        className="p-1.5 hover:bg-slate-800 rounded-md transition-transform hover:scale-110 flex items-center justify-center text-base"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="w-[1px] h-4 bg-slate-700/50 mx-1" />
                    <div className="relative flex items-center">
                      <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center" 
                        title="Add reaction"
                      >
                        <SmilePlus size={16} />
                      </button>
                      <EmojiPicker
                        isOpen={showEmojiPicker}
                        onClose={() => setShowEmojiPicker(false)}
                        onSelect={(emoji) => onToggleReaction(message.id, emoji)}
                        position="bottom"
                      />
                    </div>
                  </div>
                )}
                {!isOwn && (
                  <>
                    <div className="w-[1px] h-4 bg-slate-700/50 mx-1" />
                    <button onClick={onReplyClick} className="flex items-center gap-1.5 p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded-md transition-colors" title="Reply">
                      <Reply size={16} />
                    </button>
                    {message.content && (
                      <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded-md transition-colors" title="Copy message">
                        {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    )}
                  </>
                )}
                {isOwn && (
                  <>
                    <div className="w-[1px] h-4 bg-slate-700/50 mx-1" />
                    {message.content && (
                      <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded-md transition-colors" title="Copy message">
                        {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    )}
                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded-md transition-colors" title="Edit message">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setShowDeleteModal(true)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-md transition-colors" title="Delete message">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
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
                  {message.replyToMessage && (
                    <div 
                      onClick={() => onReplyPreviewClick?.(message.replyToMessage!.id)}
                      className={`mb-2 cursor-pointer transition-colors border-l-2 p-2 rounded-lg w-full min-w-0 shadow-sm bg-[#090d16] hover:bg-[#121826] ${
                        isOwn 
                          ? 'border-slate-700 text-slate-300' 
                          : 'border-amber-500/70 text-slate-300'
                      }`}
                    >
                      <div className={`text-[11px] font-bold mb-0.5 truncate text-amber-500`}>
                        {message.replyToMessage.sender?.fullName || message.replyToMessage.sender?.email || "Unknown"}
                      </div>
                      <div className={`text-xs text-slate-300 max-h-[80px] overflow-y-auto scrollbar-thin pr-1 whitespace-pre-wrap break-words`}>
                        {message.replyToMessage.deletedAt ? (
                          <span className={`italic text-slate-500`}>This message was deleted</span>
                        ) : (
                          message.replyToMessage.content || "Attachment"
                        )}
                      </div>
                    </div>
                  )}
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
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin pr-1 w-full">
                      <p className="text-[15px] whitespace-pre-wrap break-words font-medium leading-relaxed max-w-full" style={{ wordBreak: 'break-word' }}>
                        {formatTextWithLinks(message.content, isOwn)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reactions Bar */}
            {reactionGroups.length > 0 && !isEditing && (
              <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                {reactionGroups.map(group => (
                  <button
                    key={group.emoji}
                    onClick={() => onToggleReaction?.(message.id, group.emoji)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      group.hasReacted 
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-500 hover:bg-amber-500/30" 
                        : "bg-[#182132] border-slate-700/50 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{group.emoji}</span>
                    <span className="opacity-80">{group.count}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Timestamp shown outside bubble at bottom on hover */}
            <div className={`absolute -bottom-5 ${isOwn ? 'right-2' : 'left-2'} opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] text-slate-500 font-bold uppercase tracking-wider pointer-events-none z-10`}>
              {new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {message.editedAt && " (edited)"}
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
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        type="message"
        name="Message"
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
