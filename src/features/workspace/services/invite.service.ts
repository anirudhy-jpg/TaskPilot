import { createClient } from "@/lib/supabase/server";
import { ENV } from "@/lib/constants/env";

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: "admin" | "member";
  token: string;
  status: "pending" | "accepted" | "declined";
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  projectId?: string | null;
}

export interface InvitationDetails {
  invitation: Invitation;
  workspaceName: string;
  inviterName: string;
  projectName?: string | null;
}

export class InviteService {
  /**
   * Create a secure invitation for a workspace.
   */
  static async createInvitation(
    workspaceId: string,
    email: string,
    role: "admin" | "member",
    invitedBy: string,
    projectId?: string | null,
  ): Promise<string> {
    const supabase = await createClient();

    // 1. Verify that the inviter is the workspace owner or an admin
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (wsErr) {
      throw new Error("Failed to verify workspace owner: " + wsErr.message);
    }

    let isAuthorized = false;
    if (ws && ws.owner_id === invitedBy) {
      isAuthorized = true;
    } else {
      // Check workspace_members
      const { data: member, error: memErr } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", invitedBy)
        .maybeSingle();

      if (
        !memErr &&
        member &&
        (member.role === "owner" || member.role === "admin")
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new Error("Only workspace owners and admins can invite members.");
    }

    // 2. Prevent duplicate workspace membership
    // Check if a user with this email is already a member
    const { data: targetProfile, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!profErr && targetProfile) {
      const { data: existingMember, error: existErr } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetProfile.id)
        .maybeSingle();

      if (!existErr && existingMember) {
        throw new Error("This user is already a member of the workspace.");
      }
    }

    // 2.5 Prevent duplicate pending invitations
    const { data: existingInvite, error: inviteExistErr } = await supabase
      .from("workspace_invitations")
      .select("id, expires_at")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (!inviteExistErr && existingInvite) {
      const isExpired = new Date(existingInvite.expires_at) < new Date();
      if (!isExpired) {
        throw new Error("This user already has a pending invitation to this workspace.");
      }
    }

    // 3. Generate token and create workspace_invitations row
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expires in 7 days

    const { error: inviteErr } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        token,
        status: "pending",
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
        project_id: projectId || null,
      });

    if (inviteErr) {
      console.error("Error creating invitation row:", inviteErr);
      throw new Error(inviteErr.message);
    }

    // 4. Return the invitation URL
    const baseUrl = ENV.NEXT_PUBLIC_APP_URL;
    return `${baseUrl}/invite/accept?token=${token}`;
  }

  /**
   * Fetch invitation details by token, including workspace name, inviter name, and project name.
   */
  static async getInvitationByToken(
    token: string,
  ): Promise<InvitationDetails | null> {
    const supabase = await createClient();

    // Fetch invitation
    const { data: inviteRow, error: inviteErr } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr || !inviteRow) {
      console.error("Error fetching invitation:", inviteErr);
      return null;
    }

    // Map to Invitation type
    const invitation: Invitation = {
      id: inviteRow.id,
      workspaceId: inviteRow.workspace_id,
      email: inviteRow.email,
      role: inviteRow.role,
      token: inviteRow.token,
      status: inviteRow.status,
      invitedBy: inviteRow.invited_by,
      createdAt: inviteRow.created_at,
      expiresAt: inviteRow.expires_at,
      projectId: inviteRow.project_id,
    };

    // Fetch workspace name
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", invitation.workspaceId)
      .maybeSingle();

    // Fetch inviter name
    const { data: inviterData } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", invitation.invitedBy)
      .maybeSingle();

    // Fetch project name if projectId exists
    let projectName = null;
    if (invitation.projectId) {
      const { data: projData } = await supabase
        .from("projects")
        .select("name")
        .eq("id", invitation.projectId)
        .maybeSingle();
      projectName = projData?.name || null;
    }

    return {
      invitation,
      workspaceName: wsData?.name || "Unknown Workspace",
      inviterName: inviterData?.full_name || inviterData?.email || "Someone",
      projectName,
    };
  }

  /**
   * Accept an invitation.
   */
  static async acceptInvitation(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<string> {
    const supabase = await createClient();

    // 1. Fetch invitation
    const details = await this.getInvitationByToken(token);
    if (!details) {
      throw new Error("Invitation not found.");
    }

    const { invitation } = details;

    // 2. Validate status and expiration
    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}.`);
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error("This invitation has expired.");
    }

    // 3. Verify user's email matches
    if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("Your email does not match the invitation email.");
    }

    // 4. Check if already a member
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invitation.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMember) {
      // 4.5 If invitation has a projectId, insert into project_members even if already a workspace member
      if (invitation.projectId) {
        const { error: projMemberErr } = await supabase
          .from("project_members")
          .insert({
            project_id: invitation.projectId,
            user_id: userId,
          });

        if (projMemberErr) {
          console.warn("Could not assign existing member to project:", projMemberErr);
        }
      }

      // Mark all pending invitations for this email in this workspace as accepted
      await supabase
        .from("workspace_invitations")
        .update({ status: "accepted" })
        .eq("workspace_id", invitation.workspaceId)
        .eq("email", invitation.email)
        .eq("status", "pending");

      return invitation.workspaceId;
    }

    // 5. Insert into workspace_members
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: invitation.workspaceId,
        user_id: userId,
        role: invitation.role,
      });

    if (memberErr) {
      console.error("Error adding workspace member:", memberErr);
      throw new Error(memberErr.message);
    }

    // 5.5 If invitation has a projectId, insert into project_members
    if (invitation.projectId) {
      const { error: projMemberErr } = await supabase
        .from("project_members")
        .insert({
          project_id: invitation.projectId,
          user_id: userId,
        });

      if (projMemberErr) {
        console.warn("Could not assign member to project (might already be member):", projMemberErr);
      }
    }

    // 6. Update all pending invitations for this email in this workspace to accepted
    const { error: updateErr } = await supabase
      .from("workspace_invitations")
      .update({ status: "accepted" })
      .eq("workspace_id", invitation.workspaceId)
      .eq("email", invitation.email)
      .eq("status", "pending");

    if (updateErr) {
      console.error("Error updating invitation status:", updateErr);
    }

    return invitation.workspaceId;
  }

  /**
   * Decline an invitation.
   */
  static async declineInvitation(token: string): Promise<void> {
    const supabase = await createClient();

    // 1. Fetch invitation
    const { data: inviteRow, error: inviteErr } = await supabase
      .from("workspace_invitations")
      .select("id, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr || !inviteRow) {
      throw new Error("Invitation not found.");
    }

    if (inviteRow.status !== "pending") {
      throw new Error(`This invitation has already been ${inviteRow.status}.`);
    }

    if (new Date(inviteRow.expires_at) < new Date()) {
      throw new Error("This invitation has expired.");
    }

    // 2. Update status to declined
    const { error: updateErr } = await supabase
      .from("workspace_invitations")
      .update({ status: "declined" })
      .eq("id", inviteRow.id);

    if (updateErr) {
      console.error("Error declining invitation:", updateErr);
      throw new Error(updateErr.message);
    }
  }

  /**
   * Get all pending invitations for a workspace.
   */
  static async getPendingInvitations(
    workspaceId: string,
  ): Promise<Invitation[]> {
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

    return (data || []).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      email: row.email,
      role: row.role,
      token: row.token,
      status: row.status,
      invitedBy: row.invited_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));
  }

  /**
   * Revoke/Delete an invitation.
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
