import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Reusable backend authorization helpers.
 * These helpers perform database queries to enforce the permission system.
 * Do not rely solely on client-side state for permissions.
 */
export class PermissionsService {
  /**
   * Get the current user ID securely from the session.
   */
  static async getCurrentUserId(supabase: SupabaseClient): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error("Unauthorized: Could not retrieve user session.")
    }
    return user.id
  }

  /**
   * Get the user's role in a workspace.
   * Returns 'owner', 'admin', 'member', or null if not a member.
   */
  static async getWorkspaceRole(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string
  ): Promise<string | null> {
    // Check if the user is the workspace owner directly
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single()

    if (ws?.owner_id === userId) {
      return "owner"
    }

    // Check workspace_members
    const { data: memberInfo } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle()

    return memberInfo?.role || null
  }

  /**
   * Check if the user is an owner or admin of the workspace.
   */
  static async isWorkspaceAdmin(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string
  ): Promise<boolean> {
    const role = await this.getWorkspaceRole(supabase, userId, workspaceId)
    return role === "owner" || role === "admin"
  }

  /**
   * Check if a user can view a specific project.
   * - Admins/Owners of the project's workspace can view any project.
   * - Members can only view projects they are assigned to via project_members, or created by them.
   */
  static async canViewProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string
  ): Promise<boolean> {
    // 1. Fetch project to get its workspace_id and creator
    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id, created_by")
      .eq("id", projectId)
      .single()

    if (!project) return false

    // 2. Check workspace admin status
    const isAdmin = await this.isWorkspaceAdmin(supabase, userId, project.workspace_id)
    if (isAdmin) return true
    
    // 3. Check if creator
    if (project.created_by === userId) return true

    // 4. Check project_members table
    const { data: member } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle()

    return !!member
  }

  /**
   * Check if a user can manage a specific project.
   * Uses same logic as canViewProject as standard members can manage projects they belong to.
   */
  static async canManageProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string
  ): Promise<boolean> {
    return this.canViewProject(supabase, userId, projectId)
  }

  /**
   * Check if a user can view a specific task.
   */
  static async canViewTask(
    supabase: SupabaseClient,
    userId: string,
    taskId: string
  ): Promise<boolean> {
    const { data: task } = await supabase
      .from("tasks")
      .select("project_id")
      .eq("id", taskId)
      .maybeSingle()

    if (!task) return false
    return this.canViewProject(supabase, userId, task.project_id)
  }

  /**
   * Check if a user can view a specific conversation.
   */
  static async canViewConversation(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const { count } = await supabase
      .from("conversation_members")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)

    return (count || 0) > 0
  }

  /**
   * Check if two users share at least one workspace.
   */
  static async sharesAnyWorkspace(
    supabase: SupabaseClient,
    userA: string,
    userB: string
  ): Promise<boolean> {
    // Direct SQL join approach using Supabase Data API
    const { count, error } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userA)
      .in(
        "workspace_id",
        // Subquery approach via Supabase is limited, so we split it into 2 optimized queries:
        // First get user A's workspaces
        await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", userB)
          .then(res => (res.data || []).map(row => row.workspace_id))
      )
    
    if (error) {
      console.error("Error checking shared workspaces:", error)
      return false
    }

    return (count || 0) > 0
  }
}
