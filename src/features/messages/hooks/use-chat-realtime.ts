import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, MessageReaction } from "../types";

interface UseChatRealtimeProps {
  conversationId: string;
  onMessageInsert: (message: Message) => void;
  onMessageUpdate: (message: Message) => void;
  onMessageDelete: (messageId: string) => void;
  onReactionChange?: (reaction: MessageReaction, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

export function useChatRealtime({
  conversationId,
  onMessageInsert,
  onMessageUpdate,
  onMessageDelete,
  onReactionChange
}: UseChatRealtimeProps) {
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channelName = `chat:${conversationId}:${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === "INSERT") {
            const message: Message = {
              id: newRow.id,
              conversationId: newRow.conversation_id,
              senderId: newRow.sender_id,
              content: newRow.content,
              attachmentName: newRow.attachment_name,
              attachmentPath: newRow.attachment_path,
              attachmentSize: newRow.attachment_size,
              attachmentMimeType: newRow.attachment_mime_type,
              attachmentUploadedAt: newRow.attachment_uploaded_at,
              editedAt: newRow.edited_at,
              deletedAt: newRow.deleted_at,
              createdAt: newRow.created_at,
              // Sender is omitted here because fetching it causes a 300ms delay.
              // The ChatBox component can construct it locally from conversation.otherUser.
            };
            onMessageInsert(message);
          } else if (eventType === "UPDATE") {
            const message: Message = {
              id: newRow.id,
              conversationId: newRow.conversation_id,
              senderId: newRow.sender_id,
              content: newRow.content,
              attachmentName: newRow.attachment_name,
              attachmentPath: newRow.attachment_path,
              attachmentSize: newRow.attachment_size,
              attachmentMimeType: newRow.attachment_mime_type,
              attachmentUploadedAt: newRow.attachment_uploaded_at,
              editedAt: newRow.edited_at,
              deletedAt: newRow.deleted_at,
              createdAt: newRow.created_at,
            };
            onMessageUpdate(message);
          } else if (eventType === "DELETE") {
            onMessageDelete(oldRow.id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          if (!onReactionChange) return;
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === "INSERT" || eventType === "UPDATE") {
            onReactionChange({
              id: newRow.id,
              messageId: newRow.message_id,
              userId: newRow.user_id,
              emoji: newRow.emoji,
              createdAt: newRow.created_at,
            }, eventType);
          } else if (eventType === "DELETE") {
            // we only get id in oldRow for deletes
            onReactionChange({ id: oldRow.id } as MessageReaction, eventType);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, onMessageInsert, onMessageUpdate, onMessageDelete, onReactionChange]);
}
