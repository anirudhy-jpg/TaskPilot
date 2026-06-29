"use client"

import React, { useState, useMemo, useTransition, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Search, Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react"
import type { TypingUser } from "../hooks/use-typing-indicator"
import type { Conversation, ConversationUser } from "../types"
import {
  getOrCreateConversationAction,
  deleteConversationAction,
} from "../actions/conversations.action"
import { Avatar } from "@/components/ui/avatar"
import { usePin } from "@/features/pins/hooks/use-pin"
import { Pin, PinOff, MoreVertical } from "lucide-react"

const showWarningPopup = (message: string) => {
  const toast = document.createElement("div");
  toast.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 min-w-[300px] max-w-[400px] cursor-pointer hover:bg-slate-800/80 transition-colors`;
  toast.innerHTML = `
    <div class="flex-1 flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <span class="text-amber-500 font-semibold text-sm">Warning</span>
      </div>
      <p class="text-sm text-slate-300 break-words">${message}</p>
    </div>
  `;
  toast.onclick = () => toast.remove();
  document.body.appendChild(toast);
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, -10px)";
      toast.style.transition = "all 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

// ─── Delete Confirm Modal ──────────────────────────────────────────────────
interface DeleteConfirmModalProps {
  conversation: Conversation;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmModal({ conversation, onConfirm, onCancel, isDeleting }: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const name = conversation.otherUser?.fullName || conversation.otherUser?.email || "this user";

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-[#0f1623] border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Top danger stripe */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-orange-500" />

        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>

          {/* Title */}
          <h3 className="text-center text-lg font-black text-slate-100 mb-2">
            Delete Conversation
          </h3>

          {/* Body */}
          <p className="text-center text-sm text-slate-400 leading-relaxed mb-1">
            This will remove the chat from your list with
          </p>
          <p className="text-center text-sm font-bold text-slate-200 mb-1 truncate px-2">
            {name}
          </p>
          <p className="text-center text-sm text-slate-500 leading-relaxed mb-6">
            The chat history is preserved and will reappear if you receive a new message or start a new chat with this user.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 text-sm font-semibold hover:bg-slate-700/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Chat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── ConversationList ──────────────────────────────────────────────────────
interface ConversationListProps {
  currentUserId: string
  members: ConversationUser[]
  conversations: Conversation[]
  activeConversationId: string | null
  typingState: Record<string, TypingUser[]>
  onSelectConversation: (id: string) => void
  onNewConversation: (conv: Conversation) => void
  onDeleteConversation: (id: string) => void
}

function ConversationItem({
  conv,
  currentUserId,
  typingState,
  activeConversationId,
  onSelectConversation,
  setDeleteTarget,
}: {
  conv: Conversation;
  currentUserId: string;
  typingState: Record<string, TypingUser[]>;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  setDeleteTarget: (conv: Conversation) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const { isPinned, togglePin } = usePin({
    entityType: "conversation",
    entityId: conv.id,
    initialIsPinned: !!conv.isPinned,
  });

  const convTypingUsers = typingState[conv.id] || [];
  const isTyping = convTypingUsers.length > 0;
  const isActive = activeConversationId === conv.id;

  return (
    <div
      className={`group/item relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-[#1e1915] border border-amber-500/30"
          : "hover:bg-slate-800/30 border border-transparent"
      } ${menuOpen ? "z-50" : "z-10"}`}
      onClick={() => onSelectConversation(conv.id)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar user={conv.otherUser as NonNullable<Conversation["otherUser"]>} className="w-12 h-12 shadow-sm" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-12">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[15px] truncate font-bold text-slate-200 flex items-center gap-1.5">
            {isPinned && <Pin size={12} className="text-amber-500 shrink-0 fill-amber-500/20" />}
            {conv.otherUser?.fullName || conv.otherUser?.email}
          </p>
          {conv.lastMessage && (
            <span className="text-[10px] text-slate-500 font-bold shrink-0 ml-2">
              {new Date(conv.lastMessage.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={`truncate text-sm font-medium ${isActive ? "text-slate-300" : "text-slate-400"}`}>
            {isTyping ? (
              <span className="text-amber-500 italic flex items-center gap-1.5">
                typing
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce"></span>
                </span>
              </span>
            ) : conv.lastMessage ? (
              <>{conv.lastMessage.senderId === currentUserId ? 'You: ' : `${conv.otherUser?.fullName?.split(' ')[0] || 'User'}: `}{conv.lastMessage.content}</>
            ) : (
              <span className="italic">No messages yet</span>
            )}
          </p>
          {conv.unreadCount !== undefined && conv.unreadCount > 0 && !isActive && (
            <div className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-black text-slate-900">
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Action Menu — shown on hover */}
      <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center transition-opacity ${menuOpen ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 focus-within:opacity-100"}`}>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <MoreVertical size={14} />
          </button>
          
          {menuOpen && (
            <>
              <div className="absolute right-0 top-8 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden text-left py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin();
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 border-b border-slate-800/80"
                >
                  {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  {isPinned ? "Unpin Chat" : "Pin Chat"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(conv);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConversationList({
  currentUserId,
  members,
  conversations,
  activeConversationId,
  typingState,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => c.lastMessage != null)
      .filter(c =>
        c.otherUser?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.otherUser?.email.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = new Date(a.lastMessage!.createdAt).getTime()
        const timeB = new Date(b.lastMessage!.createdAt).getTime()
        return timeB - timeA
      })
  }, [conversations, search])

  const chateableMembers = useMemo(() => {
    const existingOtherIds = new Set(
      conversations
        .filter(c => c.lastMessage != null)
        .map(c => c.otherUser?.id)
    )
    return members.filter(m =>
      !existingOtherIds.has(m.id) &&
      (m.fullName?.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
    )
  }, [members, conversations, search])

  const handleStartChat = (userId: string) => {
    startTransition(async () => {
      const res = await getOrCreateConversationAction(userId)
      if (res.success && res.data) {
        const otherUser = members.find(m => m.id === userId)
        onNewConversation({ ...res.data, otherUser })
      } else if (res.error) {
        showWarningPopup(res.error)
      }
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteConversationAction(deleteTarget.id);
      if (res.success) {
        onDeleteConversation(deleteTarget.id);
        setDeleteTarget(null);
      } else {
        showWarningPopup(res.error || "Failed to delete conversation.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          conversation={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      <div className="flex flex-col h-full bg-[#0b0f19]">
        <div className="p-4 shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-100 tracking-tight">Messages</h2>
        </div>
        <div className="px-4 pb-4 shrink-0 border-b border-slate-800/80">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-slate-800/50 bg-[#121826] rounded-full text-sm placeholder-slate-500 text-slate-200 focus:ring-1 focus:ring-amber-500/50 shadow-inner"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-6 mt-2">
          {filteredConversations.length > 0 && (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <ConversationItem 
                  key={conv.id}
                  conv={conv}
                  currentUserId={currentUserId}
                  typingState={typingState}
                  activeConversationId={activeConversationId}
                  onSelectConversation={onSelectConversation}
                  setDeleteTarget={setDeleteTarget}
                />
              ))}
            </div>
          )}

          {chateableMembers.length > 0 && (
            <div className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 mt-6">Start New Chat</h3>
              {chateableMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => handleStartChat(member.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800/30 transition-all duration-200 text-left border border-transparent"
                >
                  <Avatar user={member as NonNullable<Conversation["otherUser"]>} className="w-12 h-12 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-200 truncate">
                      {member.fullName || member.email}
                    </p>
                    <p className="text-sm text-slate-400 font-medium truncate">
                      Start a conversation
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Plus size={16} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredConversations.length === 0 && chateableMembers.length === 0 && (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-slate-500 font-medium">No conversations found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
