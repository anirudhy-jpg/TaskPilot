import { createClient } from "@/lib/supabase/server"
import type { Workspace } from "@/types/workspace.types"

export class WorkspaceService {
  /**
   * Get the workspace for a given user (first workspace they belong to).
   */
  static async getWorkspaceForUser(userId: string): Promise<Workspace | null> {
    const supabase = await createClient()

    // First try as owner
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

    // Then try as member
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
