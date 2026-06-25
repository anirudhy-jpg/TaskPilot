"use server";

import { requireUser } from "@/lib/supabase/server";
import { MessagingService } from "../services/messaging.service";

export async function getChateableMembersAction(workspaceId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const members = await MessagingService.getChateableMembers(workspaceId, user.id);
    return { success: true, data: members };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrCreateConversationAction(workspaceId: string, otherUserId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const conversation = await MessagingService.getOrCreateConversation(workspaceId, user.id, otherUserId);
    return { success: true, data: conversation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserConversationsAction(workspaceId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const conversations = await MessagingService.getUserConversations(workspaceId, user.id);
    return { success: true, data: conversations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markConversationReadAction(conversationId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await MessagingService.markConversationRead(conversationId, user.id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSharedProjectsInfoAction(workspaceId: string, otherUserId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const info = await MessagingService.getSharedProjectsInfo(workspaceId, user.id, otherUserId);
    return { success: true, data: info };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkUnreadMessagesAction() {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const unread = await MessagingService.hasAnyUnreadMessages(user.id);
    return { success: true, data: unread };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
