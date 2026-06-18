import { createClient } from "@/lib/supabase/server"

export type NotificationType =
  | "invitation_accepted"
  | "invitation_rejected"
  | "member_left"
  | "project_member_added"
  | "task_assigned"
  | "mention"

/** Minimal duck-typed shape to accept both supabase-js and @supabase/ssr clients */
interface MinimalSupabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

interface CreateNotificationInput {
  userId: string
  workspaceId?: string
  title: string
  message: string
  type: NotificationType
  actorId?: string
  /** Optional: pass an already-authenticated supabase client to reuse the session */
  client?: MinimalSupabaseClient
}

/**
 * Inserts a single notification row into the `notifications` table.
 * Silently swallows errors so a notification failure never breaks the
 * primary action that triggered it.
 */
export async function createNotification({
  userId,
  workspaceId,
  title,
  message,
  type,
  actorId,
  client,
}: CreateNotificationInput): Promise<void> {
  try {
    const supabase = client ?? (await createClient())

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      workspace_id: workspaceId ?? null,
      title,
      message,
      type,
      read: false,
      actor_id: actorId ?? null,
    })

    if (error) {
      console.error("[NotificationService] Failed to insert notification:", error)
    }
  } catch (err) {
    console.error("[NotificationService] Unexpected error:", err)
  }
}
