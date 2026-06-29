"use client"
import React, { useState, useEffect, useCallback } from "react"
import { ConversationList } from "./conversation-list"
import { ChatBox } from "./chat-box"
import type { Conversation, ConversationUser } from "../types"
import { useConversations } from "../hooks/use-conversations"

import { useTypingIndicator } from "../hooks/use-typing-indicator"
import { useWorkspaceMembersRealtime } from "../hooks/use-workspace-members-realtime"
import { getChateableMembersAction, getOrCreateConversationAction } from "../actions/conversations.action"

interface MessagesPageProps {
  workspaceId: string  // kept for storage upload paths in ChatBox
  currentUserId: string
  currentUserName: string
  currentUserAvatarUrl: string | null
  members: ConversationUser[]
  initialConversations: Conversation[]
  autoStartUserId?: string
}

export function MessagesPage({
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  members: initialMembers,
  initialConversations,
  autoStartUserId,
}: MessagesPageProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [members, setMembers] = useState<ConversationUser[]>(initialMembers);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await getChateableMembersAction();
      if (res && res.success && Array.isArray(res.data)) {
        setMembers(res.data as ConversationUser[]);
      }
    } catch (err) {
      console.error("Failed to refetch chateable members:", err);
    }
  }, []);

  useWorkspaceMembersRealtime(fetchMembers);

  const { conversations, setConversations } = useConversations(
    currentUserId,
    initialConversations,
    activeConversationId
  );
  
  useEffect(() => {
    if (autoStartUserId && members.length > 0) {
      const existingConv = conversations.find(c => c.otherUser?.id === autoStartUserId);
      if (existingConv) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveConversationId(existingConv.id);
      } else {
        getOrCreateConversationAction(autoStartUserId).then(res => {
          if (res.success && res.data) {
             const otherUser = members.find(m => m.id === autoStartUserId);
             setConversations(prev => {
                if (prev.find(p => p.id === res.data!.id)) return prev;
                return [{ ...res.data!, otherUser }, ...prev] as Conversation[];
             });
             setActiveConversationId(res.data.id);
          }
        }).catch(err => {
          console.error("Failed to start chat from autoStartUserId:", err);
        });
      }
    }
    // Only run this once on mount, we don't want it re-triggering if things change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Typing indicator keyed by userId, not workspaceId
  const { typingState, startTyping, stopTyping } = useTypingIndicator(currentUserId, currentUserName);
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const activeTypingUsers = React.useMemo(() => {
    return activeConversation ? typingState[activeConversation.id] || [] : [];
  }, [typingState, activeConversation]);

  const otherUserId = activeConversation?.otherUser?.id;

  const handleStartTyping = React.useCallback(() => {
    if (activeConversation) startTyping(activeConversation.id, otherUserId);
  }, [activeConversation, otherUserId, startTyping]);

  const handleStopTyping = React.useCallback(() => {
    if (activeConversation) stopTyping(activeConversation.id, otherUserId);
  }, [activeConversation, otherUserId, stopTyping]);

  return (
    <div className="absolute inset-0 flex bg-[#04060b] text-slate-200 overflow-hidden">
      <div className="w-[340px] shrink-0 border-r border-slate-800 bg-[#090d16]/80 flex flex-col h-full backdrop-blur-md">
        <ConversationList
          currentUserId={currentUserId}
          members={members}
          conversations={conversations}
          activeConversationId={activeConversationId}
          typingState={typingState}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
          }}
          onNewConversation={(conv) => {
            setConversations(prev => {
               if (prev.find(p => p.id === conv.id)) return prev;
               return [{ ...conv, unreadCount: 0 }, ...prev];
            });
            setActiveConversationId(conv.id);
          }}
          onDeleteConversation={(id) => {
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConversationId === id) setActiveConversationId(null);
          }}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-[#06090f] z-10 relative">
        {activeConversation ? (
          <ChatBox
            workspaceId={workspaceId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatarUrl={currentUserAvatarUrl}
            conversation={activeConversation}
            typingUsers={activeTypingUsers}
            startTyping={handleStartTyping}
            stopTyping={handleStopTyping}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-500 bg-[#06090f]">
            <div className="w-20 h-20 rounded-3xl bg-slate-800/30 flex items-center justify-center mb-6 border border-slate-700/50 shadow-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square text-amber-500/70"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-300 mb-2">Direct Messaging</h3>
            <p className="text-sm text-slate-500 font-medium">Select a conversation or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
