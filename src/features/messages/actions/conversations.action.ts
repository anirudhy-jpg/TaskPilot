/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { requireUser } from "@/lib/supabase/server";
import { MessagingService } from "../services/messaging.service";
import { revalidatePath } from "next/cache";

/**
 * Returns all users the current user can chat with
 * (shares at least one workspace — globally scoped).
 */
export async function getChateableMembersAction() {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const members = await MessagingService.getChateableMembers(user.id);
    return { success: true, data: members };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Gets or creates a global DM conversation between the current user
 * and another user. No workspace_id required.
 */
export async function getOrCreateConversationAction(otherUserId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const conversation = await MessagingService.getOrCreateConversation(user.id, otherUserId);
    return { success: true, data: conversation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Returns the global DM conversation list for the current user.
 * Workspace-independent.
 */
export async function getUserConversationsAction() {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const conversations = await MessagingService.getUserConversations(user.id);
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

/**
 * Re-evaluates is_active for a conversation when it is opened.
 * Heals stale is_active=false values from the old workspace-scoped model.
 * The Realtime subscription in use-conversation-status will pick up the
 * DB update and re-enable the message input automatically.
 */
export async function refreshConversationStatusAction(conversationId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const isActive = await MessagingService.refreshSingleConversationStatus(conversationId, user.id);
    return { success: true, data: isActive };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Returns shared workspaces between the current user and another user.
 * Used in the chat header to show "Shared Workspaces (N)".
 */
export async function getSharedWorkspacesInfoAction(otherUserId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const info = await MessagingService.getSharedWorkspacesInfo(user.id, otherUserId);
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

/**
 * Permanently deletes a conversation and all its messages.
 * The requesting user must be a participant.
 */
export async function deleteConversationAction(conversationId: string) {
  const { user } = await requireUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await MessagingService.deleteConversation(conversationId, user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
