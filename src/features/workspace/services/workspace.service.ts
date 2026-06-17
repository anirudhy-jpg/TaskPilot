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
        // Fetch workspace details and verify user membership in a single query
        const { data: ws } = await supabase
          .from("workspaces")
          .select(`
            id,
            name,
            owner_id,
            created_at,
            workspace_members!inner(user_id, role)
          `)
          .eq("id", activeWorkspaceId)
          .eq("workspace_members.user_id", userId)
          .maybeSingle()

        if (ws) {
          const members = ws.workspace_members
          const role = Array.isArray(members) ? members[0]?.role : (members as any)?.role
          return mapWorkspace(ws, role)
        }
      }
    } catch (err) {
      console.warn("Could not retrieve active_workspace_id from cookies:", err)
    }

    // 2. Default: Fetch user's first workspace membership (either owner or member role) and join workspace details
    const { data: memberRow, error: memErr } = await supabase
      .from("workspace_members")
      .select(`
        workspace_id,
        role,
        workspaces (
          id,
          name,
          owner_id,
          created_at
        )
      `)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

    if (memErr) {
      console.error("Error fetching workspace membership:", memErr)
      throw new Error(memErr.message)
    }

    if (!memberRow) return null

    const ws = Array.isArray(memberRow.workspaces) ? memberRow.workspaces[0] : memberRow.workspaces
    return ws ? mapWorkspace(ws, memberRow.role) : null
  }

  /**
   * Create a new workspace and add the creator as owner in workspace_members.
   * Both operations must succeed — a workspace without an owner membership
   * row is an orphan that breaks all workspace queries.
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

    // Add creator as owner member — this MUST succeed.
    // A workspace row without a corresponding workspace_members row is an
    // orphan: the user will appear to have no workspace on every login.
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: data.id,
        user_id: ownerId,
        role: "owner",
      })

    if (memberErr) {
      console.error("Error adding owner as member:", memberErr)
      throw new Error(
        `Workspace created but failed to create owner membership: ${memberErr.message}`
      )
    }

    return mapWorkspace(data, "owner")
  }

  /**
   * Idempotent: ensures the owner has a workspace_members row for their workspace.
   * Used by the onboarding repair path to fix orphan workspaces created before
   * the membership-throw fix was in place.
   * Safe to call multiple times — uses upsert with ignoreDuplicates.
   */
  static async ensureOwnerMembership(
    workspaceId: string,
    ownerId: string
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("workspace_members")
      .upsert(
        { workspace_id: workspaceId, user_id: ownerId, role: "owner" },
        { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
      )

    if (error) {
      console.error("Error ensuring owner membership:", error)
      throw new Error(error.message)
    }
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
function mapWorkspace(row: any, userRole?: string): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    currentUserRole: userRole,
  }
}

