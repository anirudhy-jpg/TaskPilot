import { createClient } from "@/lib/supabase/client";
import {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from "@supabase/supabase-js";
import { RealtimeEvent } from "./realtimeTypes";

interface CreateChannelOptions {
  table: string;
  filter?: string;
  schema?: string;
  event?: RealtimeEvent;
  onPayload: (
    payload: RealtimePostgresChangesPayload<Record<string, any>>,
  ) => void;
}

/**
 * Creates and subscribes to a Supabase Realtime channel for postgres changes.
 * Returns a cleanup function to unsubscribe and remove the channel.
 */
export function createRealtimeChannel({
  table,
  filter,
  schema = "public",
  event = "*",
  onPayload,
}: CreateChannelOptions): {
  channel: RealtimeChannel;
  unsubscribe: () => void;
} {
  const supabase = createClient();

  // Create a unique channel name based on table, filter, and a unique instance key to avoid channel sharing errors
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const channelName = `db-changes:${schema}:${table}:${filter || "all"}:${uniqueId}`;
  const channel = supabase.channel(channelName);

  channel.on(
    "postgres_changes",
    {
      event,
      schema,
      table,
      filter,
    },
    (payload) => {
      onPayload(payload);
    },
  );

  channel.subscribe((status, err) => {
    if (status === "SUBSCRIBED") {
      console.log(`[Supabase Realtime] Subscribed to table: ${table}`);
    } else if (status === "CHANNEL_ERROR") {
      console.error(`[Supabase Realtime] Subscription error for table: ${table}:`, err);
    }
  });

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
