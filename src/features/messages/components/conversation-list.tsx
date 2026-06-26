"use client"

import React, { useState, useMemo, useTransition } from "react"
import { Search, Plus, MessageSquare, Lock } from "lucide-react"
import type { TypingUser } from "../hooks/use-typing-indicator"
import type { Conversation, ConversationUser } from "../types"
import { getOrCreateConversationAction } from "../actions/conversations.action"
import { Avatar } from "@/components/ui/avatar"
import { CHAT_LIMITS } from "../constants"

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

interface ConversationListProps {
  workspaceId: string
  currentUserId: string
  members: ConversationUser[]
  conversations: Conversation[]
  activeConversationId: string | null
  typingState: Record<string, TypingUser[]>
  onSelectConversation: (id: string) => void
  onNewConversation: (conv: Conversation) => void
}

export function ConversationList({
  workspaceId,
  currentUserId,
  members,
  conversations,
  activeConversationId,
  typingState,
  onSelectConversation,
  onNewConversation
}: ConversationListProps) {
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()
  
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => c.lastMessage != null)
      .filter(c => 
        c.otherUser?.fullName?.toLowerCase().includes(search.toLowerCase()) || 
        c.otherUser?.email.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const timeA = new Date(a.lastMessage!.createdAt).getTime()
        const timeB = new Date(b.lastMessage!.createdAt).getTime()
        return timeB - timeA
      })
  }, [conversations, search])

  const chateableMembers = useMemo(() => {
    // Exclude members we already have an active conversation with
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
      const res = await getOrCreateConversationAction(workspaceId, userId)
      if (res.success && res.data) {
        // Need to add the otherUser to the returned conversation since action doesn't populate it perfectly
        const otherUser = members.find(m => m.id === userId)
        onNewConversation({ ...res.data, otherUser })
      } else {
        // handle error visually if needed
        console.error(res.error)
      }
    })
  }

  return (
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
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-6 mt-2">
        {filteredConversations.length > 0 && (
          <div className="space-y-1">
            <h3 className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Recent</h3>
            {filteredConversations.map((conv, i) => {
              const convTypingUsers = typingState[conv.id] || [];
              const isTyping = convTypingUsers.length > 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left relative ${
                    activeConversationId === conv.id 
                      ? "bg-[#1e1915] border border-amber-500/30" 
                      : "hover:bg-slate-800/30 border border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar user={conv.otherUser as any} className="w-12 h-12 shadow-sm" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[15px] truncate font-bold text-slate-200">
                        {conv.otherUser?.fullName || conv.otherUser?.email}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-slate-500 font-bold shrink-0 ml-2">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={`truncate text-sm font-medium ${activeConversationId === conv.id ? "text-slate-300" : "text-slate-400"}`}>
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
                      {conv.unreadCount !== undefined && conv.unreadCount > 0 && conv.id !== activeConversationId && (
                        <div className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-black text-slate-900">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
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
                <Avatar user={member as any} className="w-12 h-12 shadow-sm" />
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
  )
}
