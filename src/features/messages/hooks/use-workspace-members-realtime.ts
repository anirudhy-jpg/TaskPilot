import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useWorkspaceMembersRealtime(
  onMembershipChange: () => void
) {
  useEffect(() => {
    const supabase = createClient();
    const channelName = `workspace-members-global-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workspace_members" },
        () => onMembershipChange()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "workspace_members" },
        () => onMembershipChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onMembershipChange]);
}
