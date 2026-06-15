import { createClient } from "@/lib/supabase/server"
import type { Workspace } from "../types/workspace.types"

export class WorkspaceHubService {
  /**
   * Get all workspaces for a user (both owned and member).
   */
  static async getWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const supabase = await createClient()

    // Fetch all workspace memberships for the user and join workspace details
    const { data: memberedRows, error } = await supabase
      .from("workspace_members")
      .select(`
        workspace_id,
        workspaces (
          id,
          name,
          owner_id,
          created_at
        )
      `)
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching workspaces:", error)
      throw new Error(error.message)
    }

    return (memberedRows || [])
      .map((row) => {
        const ws = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces
        return ws ? {
          id: ws.id,
          name: ws.name,
          ownerId: ws.owner_id,
          createdAt: ws.created_at,
        } : null
      })
      .filter((ws): ws is NonNullable<typeof ws> => ws !== null)
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
