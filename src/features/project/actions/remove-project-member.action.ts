"use server"

import { revalidatePath } from "next/cache"
import { requireUser, createClient } from "@/lib/supabase/server"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function removeProjectMemberAction(
  projectId: string,
  userId: string
): Promise<ActionResponse> {
  try {
    const { user } = await requireUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const supabase = await createClient()

    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .maybeSingle()

    if (!project) {
      return { success: false, error: "Project not found" }
    }

    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", project.workspace_id)
      .maybeSingle()

    if (!ws || ws.owner_id !== user.id) {
      return { success: false, error: "Unauthorized: Only the workspace owner can remove members from projects." }
    }

    const { error: deleteErr } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId)

    if (deleteErr) throw deleteErr

    revalidatePath("/projects", "layout")
    revalidatePath("/workspace")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove member from project."
    return { success: false, error: message }
  }
}
