import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "../types";

export function useConversations(
  workspaceId: string,
  currentUserId: string | undefined,
  initialConversations: Conversation[],
  activeConversationId: string | null
) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    if (!workspaceId || !currentUserId) return;
    
    const supabase = createClient();
    const channelName = `conversations-${workspaceId}-${currentUserId}:${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);
    
    // Listen for conversation isActive updates
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations", filter: `workspace_id=eq.${workspaceId}` },
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
  }, [workspaceId, currentUserId, activeConversationId]);

  return { conversations, setConversations };
}
