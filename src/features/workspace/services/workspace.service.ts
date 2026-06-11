import { createClient } from "@/lib/supabase/server"
import type { Workspace } from "../types/workspace.types"

export class WorkspaceService {
  /**
   * Get the workspace for a given user (first workspace they belong to).
   */
  static async getWorkspaceForUser(userId: string): Promise<Workspace | null> {
    const supabase = await createClient()

    // 1. Check if active_workspace_id cookie exists and is valid for this user
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value
      if (activeWorkspaceId) {
        // Verify user is owner or member of this workspace
        const { data: isOwner } = await supabase
          .from("workspaces")
          .select("id")
          .eq("id", activeWorkspaceId)
          .eq("owner_id", userId)
          .maybeSingle()

        if (isOwner) {
          const { data: ws } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", activeWorkspaceId)
            .single()
          if (ws) return mapWorkspace(ws)
        }

        const { data: isMember } = await supabase
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", activeWorkspaceId)
          .eq("user_id", userId)
          .maybeSingle()

        if (isMember) {
          const { data: ws } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", activeWorkspaceId)
            .single()
          if (ws) return mapWorkspace(ws)
        }
      }
    } catch (err) {
      console.warn("Could not retrieve active_workspace_id from cookies:", err)
    }

    // 2. Default: First try as owner
    const { data: ownedWs, error: ownErr } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle()

    if (ownErr) {
      console.error("Error fetching owned workspace:", ownErr)
      throw new Error(ownErr.message)
    }

    if (ownedWs) {
      return mapWorkspace(ownedWs)
    }

    // 3. Then try as member
    const { data: memberRow, error: memErr } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

    if (memErr) {
      console.error("Error fetching workspace membership:", memErr)
      throw new Error(memErr.message)
    }

    if (!memberRow) return null

    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", memberRow.workspace_id)
      .single()

    if (wsErr) {
      console.error("Error fetching workspace:", wsErr)
      throw new Error(wsErr.message)
    }

    return mapWorkspace(ws)
  }

  /**
   * Create a new workspace and add the creator as owner in workspace_members.
   */
  static async createWorkspace(
    name: string,
    ownerId: string
  ): Promise<Workspace> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name, owner_id: ownerId })
      .select()
      .single()

    if (error) {
      console.error("Error creating workspace:", error)
      throw new Error(error.message)
    }

    // Add creator as owner member
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: data.id,
        user_id: ownerId,
        role: "owner",
      })

    if (memberErr) {
      console.error("Error adding owner as member:", memberErr)
      // Workspace was created, log but don't throw
    }

    return mapWorkspace(data)
  }

  /**
   * Get workspace by ID.
   */
  static async getWorkspaceById(id: string): Promise<Workspace | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching workspace:", error)
      throw new Error(error.message)
    }

    return data ? mapWorkspace(data) : null
  }

  /**
   * Delete a workspace.
   */
  static async deleteWorkspace(workspaceId: string, ownerId: string): Promise<void> {
    const supabase = await createClient()

    // Verify ownership
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle()

    if (!ws || ws.owner_id !== ownerId) {
      throw new Error("Unauthorized: Only the workspace owner can delete this workspace.")
    }

    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)

    if (error) {
      console.error("Error deleting workspace:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Rename a workspace.
   */
  static async renameWorkspace(workspaceId: string, name: string, ownerId: string): Promise<Workspace> {
    const supabase = await createClient()

    // Verify ownership
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle()

    if (!ws || ws.owner_id !== ownerId) {
      throw new Error("Unauthorized: Only the workspace owner can rename this workspace.")
    }

    const { data, error } = await supabase
      .from("workspaces")
      .update({ name })
      .eq("id", workspaceId)
      .select()
      .single()

    if (error) {
      console.error("Error renaming workspace:", error)
      throw new Error(error.message)
    }

    return mapWorkspace(data)
  }
}

// ─── Helpers ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkspace(row: any): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }
}
