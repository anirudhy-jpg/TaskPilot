"use server";

import { requireUser } from "@/lib/supabase/server";
import { MessagingService } from "../services/messaging.service";
import { CHAT_LIMITS } from "../constants";

export async function getMessagesAction(conversationId: string, cursor?: string, limit?: number) {
  if (limit && limit > CHAT_LIMITS.MESSAGES_PER_PAGE) {
    limit = CHAT_LIMITS.MESSAGES_PER_PAGE;
  } else if (!limit) {
    limit = CHAT_LIMITS.MESSAGES_PER_PAGE;
  }
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const result = await MessagingService.getMessages(conversationId, cursor, limit);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendMessageAction(
  conversationId: string, 
  content: string,
  attachment?: {
    name: string;
    path: string;
    size: number;
    mimeType: string;
  }
) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const message = await MessagingService.sendMessage(conversationId, content, user.id, attachment);
    return { success: true, data: message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function editMessageAction(messageId: string, content: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const message = await MessagingService.editMessage(messageId, content, user.id);
    return { success: true, data: message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMessageAction(messageId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await MessagingService.deleteMessage(messageId, user.id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
