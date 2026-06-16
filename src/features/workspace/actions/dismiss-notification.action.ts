"use server"

import { requireUser } from "@/lib/supabase/server"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function dismissNotificationAction(notificationId: string): Promise<ActionResponse> {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return { success: false, error: "You must be logged in to manage notifications." }
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to dismiss notification."
    return {
      success: false,
      error: message,
    }
  }
}
