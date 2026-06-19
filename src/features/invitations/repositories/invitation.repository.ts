import { createClient } from "@/lib/supabase/server";

export interface DBInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  status: "pending" | "accepted" | "declined";
  invited_by: string;
  created_at: string;
  expires_at: string;
  project_id?: string | null;
  project_ids?: string[] | null;
}

export class InvitationRepository {
  /**
   * Verify if a user is the owner or an admin of a workspace.
   */
  static async isAuthorizedInviter(workspaceId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();

    // 1. Check workspace owner
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (wsErr) {
      throw new Error("Failed to verify workspace owner: " + wsErr.message);
    }

    if (ws && ws.owner_id === userId) {
      return true;
    }

    // 2. Check workspace members role
    const { data: member, error: memErr } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!memErr && member && (member.role === "owner" || member.role === "admin")) {
      return true;
    }

    return false;
  }

  /**
   * Check if a profile exists by email.
   */
  static async getProfileByEmail(email: string): Promise<{ id: string } | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  /**
   * Check if user is already a member of the workspace.
   */
  static async isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    return !error && !!data;
  }

  /**
   * Check for an existing pending invitation that hasn't expired.
   */
  static async getPendingInvitation(workspaceId: string, email: string): Promise<DBInvitation | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !data) return null;
    return data as DBInvitation;
  }

  /**
   * Insert a new invitation record.
   */
  static async insertInvitation(
    workspaceId: string,
    email: string,
    role: "admin" | "member",
    token: string,
    invitedBy: string,
    expiresAt: Date,
    projectIds: string[]
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("workspace_invitations").insert({
      workspace_id: workspaceId,
      email,
      role,
      token,
      status: "pending",
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
      project_id: projectIds[0] || null,
      project_ids: projectIds,
    });

    if (error) {
      throw new Error("Failed to insert invitation: " + error.message);
    }
  }

  /**
   * Get workspace details (name, owner_id) by workspace ID.
   */
  static async getWorkspaceById(workspaceId: string): Promise<{ name: string; owner_id: string } | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspaces")
      .select("name, owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  /**
   * Get profile details (full_name, email) by user ID.
   */
  static async getProfileById(userId: string): Promise<{ full_name: string | null; email: string } | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  /**
   * Get project names by their IDs.
   */
  static async getProjectNamesByIds(projectIds: string[]): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("name")
      .in("id", projectIds);

    if (error || !data) return [];
    return data.map((p) => p.name);
  }

  /**
   * Get all project IDs in a workspace.
   */
  static async getAllProjectIdsByWorkspace(workspaceId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (error || !data) return [];
    return data.map((p) => p.id);
  }

  /**
   * Get raw invitation record by token.
   */
  static async getInvitationByToken(token: string): Promise<DBInvitation | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) return null;
    return data as DBInvitation;
  }

  /**
   * Add a member to a workspace.
   */
  static async addWorkspaceMember(workspaceId: string, userId: string, role: "admin" | "member"): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    });

    if (error) {
      throw new Error("Failed to add workspace member: " + error.message);
    }
  }

  /**
   * Add a member to projects.
   */
  static async addProjectMembers(projectIds: string[], userId: string): Promise<void> {
    const supabase = await createClient();
    const inserts = projectIds.map((projectId) => ({
      project_id: projectId,
      user_id: userId,
    }));

    const { error } = await supabase.from("project_members").insert(inserts);
    if (error) {
      console.warn("Could not assign member to projects:", error);
    }
  }

  /**
   * Update invitation status by token.
   */
  static async updateInvitationStatusByToken(token: string, status: "accepted" | "declined"): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("workspace_invitations")
      .update({ status })
      .eq("token", token);

    if (error) {
      throw new Error("Failed to update invitation status: " + error.message);
    }
  }

  /**
   * Update all pending invitations for a specific email in a workspace.
   */
  static async acceptPendingInvitations(workspaceId: string, email: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("workspace_invitations")
      .update({ status: "accepted" })
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending");

    if (error) {
      console.warn("Failed to mark duplicate pending invitations as accepted:", error);
    }
  }

  /**
   * Create notification.
   */
  static async createNotification(
    userId: string,
    workspaceId: string,
    title: string,
    message: string,
    type: string,
    actorId: string | null
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      workspace_id: workspaceId,
      title,
      message,
      type,
      actor_id: actorId,
    });

    if (error) {
      console.error("Error creating notification:", error);
    }
  }

  /**
   * Get all pending invitations for a workspace.
   */
  static async getPendingInvitations(workspaceId: string): Promise<DBInvitation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending invitations:", error);
      throw new Error(error.message);
    }

    return (data || []) as DBInvitation[];
  }

  /**
   * Revoke/delete an invitation by its ID.
   */
  static async revokeInvitation(invitationId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      console.error("Error revoking invitation:", error);
      throw new Error(error.message);
    }
  }
}
