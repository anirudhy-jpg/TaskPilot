import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useConversationStatus(conversationId: string, initialStatus: boolean) {
  const [isActive, setIsActive] = useState(initialStatus);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsActive(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channelName = `status:${conversationId}:${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` },
        (payload) => {
          setIsActive(payload.new.is_active);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return isActive;
}
