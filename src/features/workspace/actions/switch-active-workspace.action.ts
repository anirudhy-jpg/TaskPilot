"use server"

import { revalidatePath } from "next/cache"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function switchActiveWorkspaceAction(
  workspaceId: string
): Promise<ActionResponse> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    cookieStore.set("active_workspace_id", workspaceId, { path: "/" })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to switch active workspace."
    return {
      success: false,
      error: message,
    }
  }
}
