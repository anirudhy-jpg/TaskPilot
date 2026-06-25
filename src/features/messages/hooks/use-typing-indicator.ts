import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface TypingUser {
  userId: string;
  userName: string;
  lastTypedAt: number;
}

export function useTypingIndicator(
  workspaceId: string,
  currentUserId: string,
  currentUserName: string
) {
  // Map of conversationId -> TypingUser[]
  const [typingState, setTypingState] = useState<Record<string, TypingUser[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastRef = useRef<Record<string, number>>({});
  const [supabase] = useState(() => createClient());

  // Setup Realtime Channel
  useEffect(() => {
    if (!workspaceId || !currentUserId) return;

    const channel = supabase.channel(`typing:workspace:${workspaceId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const { conversationId, userId, userName, isTyping } = payload.payload;
        
        if (userId === currentUserId) return; // Ignore own events

        setTypingState((prev) => {
          const currentConvTyping = prev[conversationId] || [];

          if (!isTyping) {
            const updated = currentConvTyping.filter((u) => u.userId !== userId);
            if (updated.length === 0) {
              const newState = { ...prev };
              delete newState[conversationId];
              return newState;
            }
            return { ...prev, [conversationId]: updated };
          }

          const existing = currentConvTyping.find((u) => u.userId === userId);
          if (existing) {
             return { ...prev, [conversationId]: currentConvTyping.map(u => u.userId === userId ? { ...u, lastTypedAt: Date.now() } : u) };
          } else {
             return { ...prev, [conversationId]: [...currentConvTyping, { userId, userName, lastTypedAt: Date.now() }] };
          }
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setTypingState({});
    };
  }, [workspaceId, currentUserId, currentUserName, supabase]);

  // Prune stale typing indicators (disappear after 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingState((prev) => {
        let changed = false;
        const newState: Record<string, TypingUser[]> = {};
        
        for (const [convId, users] of Object.entries(prev)) {
          const active = users.filter((u) => now - u.lastTypedAt < 3000);
          if (active.length !== users.length) changed = true;
          if (active.length > 0) newState[convId] = active;
        }
        
        return changed ? newState : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Broadcast Actions
  const startTyping = useCallback((conversationId: string) => {
    if (!channelRef.current || !conversationId) return;

    const now = Date.now();
    const lastBroadcast = lastBroadcastRef.current[conversationId] || 0;
    
    // Debounce: Only broadcast every 2 seconds if continuously typing
    if (now - lastBroadcast > 2000) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { conversationId, userId: currentUserId, userName: currentUserName, isTyping: true },
      });
      lastBroadcastRef.current[conversationId] = now;
    }
  }, [currentUserId, currentUserName]);

  const stopTyping = useCallback((conversationId: string) => {
    if (!channelRef.current || !conversationId) return;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { conversationId, userId: currentUserId, userName: currentUserName, isTyping: false },
    });
    // Reset the broadcast ref so we can instantly broadcast a start again
    lastBroadcastRef.current[conversationId] = 0;
  }, [currentUserId, currentUserName]);

  return { typingState, startTyping, stopTyping };
}
