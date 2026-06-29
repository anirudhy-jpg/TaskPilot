import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "../types";

/**
 * Manages the global conversation list state and Realtime updates.
 * Workspace-independent — switching workspaces never reloads conversations.
 */
export function useConversations(
  currentUserId: string | undefined,
  initialConversations: Conversation[],
  activeConversationId: string | null
) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    if (!currentUserId) return;
    
    const supabase = createClient();
    // Use a stable channel name that doesn't depend on workspaceId
    const channelName = `conversations-global-${currentUserId}:${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);
    
    // Listen for conversation isActive updates (for any conversation the user is in)
    // We listen without a workspace_id filter since conversations are now global
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations" },
      (payload) => {
        const newRow = payload.new;
        setConversations(prev => prev.map(c => 
          c.id === newRow.id ? { ...c, isActive: newRow.is_active } : c
        ));
      }
    );

    // Listen for new messages to update lastMessage and unreadCount
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const newMsg = payload.new;
        setConversations(prev => {
          if (!prev.find(c => c.id === newMsg.conversation_id)) return prev;
          
          return prev.map(c => {
             if (c.id === newMsg.conversation_id) {
                const isUnread = newMsg.sender_id !== currentUserId && c.id !== activeConversationId;
                return {
                   ...c,
                   lastMessage: { content: newMsg.content, senderId: newMsg.sender_id, createdAt: newMsg.created_at },
                   unreadCount: (c.unreadCount || 0) + (isUnread ? 1 : 0)
                };
             }
             return c;
          }).sort((a, b) => {
             const aDate = a.lastMessage?.createdAt || a.createdAt;
             const bDate = b.lastMessage?.createdAt || b.createdAt;
             return new Date(bDate).getTime() - new Date(aDate).getTime();
          });
        });
      }
    );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // NOTE: workspaceId intentionally excluded — conversation list must not
  // reload or re-subscribe when the active workspace changes.
  }, [currentUserId, activeConversationId]);

  return { conversations, setConversations };
}
