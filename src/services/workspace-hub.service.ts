import { createClient } from "@/lib/supabase/server"
import type { Workspace } from "@/types/workspace.types"

export class WorkspaceHubService {
  /**
   * Get all workspaces for a user (both owned and member).
   */
  static async getWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const supabase = await createClient()

    // 1. Get workspaces owned by user
    const { data: owned, error: ownedErr } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", userId)

    if (ownedErr) {
      console.error("Error fetching owned workspaces:", ownedErr)
      throw new Error(ownedErr.message)
    }

    // 2. Get workspaces user is a member of (excluding owner role to prevent duplicates)
    const { data: memberedRows, error: memberedErr } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .neq("role", "owner")

    if (memberedErr) {
      console.error("Error fetching membered rows:", memberedErr)
      throw new Error(memberedErr.message)
    }

    const memberWorkspaceIds = (memberedRows || []).map((row) => row.workspace_id)

    let membered: any[] = []
    if (memberWorkspaceIds.length > 0) {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", memberWorkspaceIds)

      if (error) {
        console.error("Error fetching member workspaces:", error)
        throw new Error(error.message)
      }
      membered = data || []
    }

    const allWorkspaces = [...(owned || []), ...membered]
    return allWorkspaces.map((row) => ({
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      createdAt: row.created_at,
    }))
  }

  /**
   * Leave a workspace (removes user from workspace_members and project_members).
   */
  static async leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    // 1. Double check the user is not the owner
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single()

    if (wsErr) {
      throw new Error("Workspace not found")
    }

    if (ws.owner_id === userId) {
      throw new Error("Owners cannot leave their own workspace. Delete the workspace or transfer ownership first.")
    }

    // 2. Delete from workspace_members
    const { error: deleteErr } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)

    if (deleteErr) {
      console.error("Error leaving workspace:", deleteErr)
      throw new Error(deleteErr.message)
    }

    // 3. Remove project memberships for projects within this workspace
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId)

    if (projects && projects.length > 0) {
      const projectIds = projects.map((p) => p.id)
      await supabase
        .from("project_members")
        .delete()
        .in("project_id", projectIds)
        .eq("user_id", userId)
    }
  }
}
