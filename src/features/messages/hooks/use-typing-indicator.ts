import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface TypingUser {
  userId: string;
  userName: string;
  lastTypedAt: number;
}

/**
 * Manages typing indicator state and Realtime broadcast.
 *
 * The channel is keyed by currentUserId (not workspaceId) so that
 * it survives workspace switches without tearing down and re-creating
 * the subscription, and so that both participants in a global DM can
 * always communicate typing events regardless of which workspace is active.
 */
export function useTypingIndicator(
  currentUserId: string,
  currentUserName: string
) {
  // Map of conversationId -> TypingUser[]
  const [typingState, setTypingState] = useState<Record<string, TypingUser[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastRef = useRef<Record<string, number>>({});
  const [supabase] = useState(() => createClient());

  // Setup Realtime Channel — keyed by user ID, not workspace ID
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel(`typing:global:${currentUserId}`, {
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
  }, [currentUserId, currentUserName, supabase]);

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

  /**
   * The other user needs to receive our typing event on their channel.
   * We broadcast to THEIR channel key `typing:global:{otherUserId}`.
   */
  const startTyping = useCallback((conversationId: string, otherUserId?: string) => {
    if (!conversationId) return;

    const now = Date.now();
    const lastBroadcast = lastBroadcastRef.current[conversationId] || 0;
    
    // Debounce: Only broadcast every 2 seconds if continuously typing
    if (now - lastBroadcast > 2000) {
      const payload = { conversationId, userId: currentUserId, userName: currentUserName, isTyping: true };
      
      // Broadcast on our own channel (for any listeners on our channel)
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload,
        });
      }
      
      // Also broadcast on the other user's channel if we know their ID
      if (otherUserId) {
        const supabaseClient = supabase;
        const otherChannel = supabaseClient.channel(`typing:global:${otherUserId}`, {
          config: { broadcast: { self: false } },
        });
        // We need a subscribed channel to broadcast. Use a one-shot approach.
        otherChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            otherChannel.send({
              type: "broadcast",
              event: "typing",
              payload,
            });
          }
        });
        // Clean up after a short time
        setTimeout(() => supabase.removeChannel(otherChannel), 3000);
      }
      
      lastBroadcastRef.current[conversationId] = now;
    }
  }, [currentUserId, currentUserName, supabase]);

  const stopTyping = useCallback((conversationId: string, otherUserId?: string) => {
    const payload = { conversationId, userId: currentUserId, userName: currentUserName, isTyping: false };
    
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload,
      });
    }

    if (otherUserId) {
      const supabaseClient = supabase;
      const otherChannel = supabaseClient.channel(`typing:global:${otherUserId}`, {
        config: { broadcast: { self: false } },
      });
      otherChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          otherChannel.send({
            type: "broadcast",
            event: "typing",
            payload,
          });
        }
      });
      setTimeout(() => supabase.removeChannel(otherChannel), 3000);
    }
    
    // Reset the broadcast ref so we can instantly broadcast a start again
    lastBroadcastRef.current[conversationId] = 0;
  }, [currentUserId, currentUserName, supabase]);

  return { typingState, startTyping, stopTyping };
}
