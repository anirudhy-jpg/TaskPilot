import { InvitationRepository } from "../repositories/invitation.repository";
import { sendEmail } from "@/lib/email/sendgrid";
import { getInvitationEmailHtml } from "@/lib/email/templates/invitation-email";

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
  projectIds?: string[] | null;
}

export interface InvitationDetails {
  invitation: Invitation;
  workspaceName: string;
  inviterName: string;
  projectName?: string | null;
  projectNames?: string[] | null;
  ownerId?: string | null;
}

export class InviteService {
  /**
   * Create a secure invitation for a workspace and send it via SendGrid.
   */
  static async createInvitation(
    workspaceId: string,
    email: string,
    role: "admin" | "member",
    invitedBy: string,
    projectIds: string[]
  ): Promise<{ success: boolean; emailSent: boolean; data?: string }> {
    // 1. Verify that the inviter is the workspace owner or an admin
    const isAuthorized = await InvitationRepository.isAuthorizedInviter(workspaceId, invitedBy);
    if (!isAuthorized) {
      throw new Error("Only workspace owners and admins can invite members.");
    }

    // 2. Prevent duplicate workspace membership
    const targetProfile = await InvitationRepository.getProfileByEmail(email);
    if (targetProfile) {
      const alreadyMember = await InvitationRepository.isWorkspaceMember(workspaceId, targetProfile.id);
      if (alreadyMember) {
        throw new Error("This user is already a member of the workspace.");
      }
    }

    // 3. Prevent duplicate pending invitations
    const existingInvite = await InvitationRepository.getPendingInvitation(workspaceId, email);
    if (existingInvite) {
      const isExpired = existingInvite.expires_at ? new Date(existingInvite.expires_at) < new Date() : false;
      if (!isExpired) {
        throw new Error("This user already has a pending invitation to this workspace.");
      }
    }

    // 4. Generate token and create workspace_invitations row
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expires in 7 days

    await InvitationRepository.insertInvitation(
      workspaceId,
      email,
      role,
      token,
      invitedBy,
      expiresAt,
      projectIds
    );

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationUrl = `${baseUrl}/invite/${token}`;

    // 5. Send invitation email via SendGrid
    let emailSent = false;
    try {
      const workspaceDetails = await InvitationRepository.getWorkspaceById(workspaceId);
      const inviterDetails = await InvitationRepository.getProfileById(invitedBy);
      const projectNames = await InvitationRepository.getProjectNamesByIds(projectIds);

      const workspaceName = workspaceDetails?.name || "Unknown Workspace";
      const inviterName = inviterDetails?.full_name || inviterDetails?.email || "Someone";
      const projectName = projectNames.join(", ") || "No project assigned";

      const emailHtml = getInvitationEmailHtml({
        inviterName,
        workspaceName,
        projectName,
        invitationUrl,
      });

      const emailResult = await sendEmail({
        to: email,
        subject: `${inviterName} invited you to join ${workspaceName} on TaskPilot`,
        html: emailHtml,
      });

      emailSent = emailResult.success;
      if (!emailSent) {
        console.error("Failed to deliver invitation email via SendGrid:", emailResult.error);
      }
    } catch (emailErr) {
      console.error("Exception raised during email sending process:", emailErr);
    }

    // Return success response, invitation remains valid even if email fails
    return {
      success: true,
      emailSent,
      data: invitationUrl,
    };
  }

  /**
   * Fetch invitation details by token.
   */
  static async getInvitationByToken(token: string): Promise<InvitationDetails | null> {
    const inviteRow = await InvitationRepository.getInvitationByToken(token);
    if (!inviteRow) return null;

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
      projectIds: inviteRow.project_ids || (inviteRow.project_id ? [inviteRow.project_id] : []),
    };

    const wsData = await InvitationRepository.getWorkspaceById(invitation.workspaceId);
    const inviterData = await InvitationRepository.getProfileById(invitation.invitedBy);
    
    let projectNames: string[] = [];
    if (invitation.projectIds && invitation.projectIds.length > 0) {
      projectNames = await InvitationRepository.getProjectNamesByIds(invitation.projectIds);
    }

    return {
      invitation,
      workspaceName: wsData?.name || "Unknown Workspace",
      inviterName: inviterData?.full_name || inviterData?.email || "Someone",
      projectName: projectNames.join(", ") || null,
      projectNames,
      ownerId: wsData?.owner_id || null,
    };
  }

  /**
   * Accept an invitation.
   */
  static async acceptInvitation(
    token: string,
    userId: string,
    userEmail: string
  ): Promise<string> {
    // 1. Fetch invitation details
    const details = await this.getInvitationByToken(token);
    if (!details) {
      throw new Error("Invitation not found.");
    }

    const { invitation } = details;

    // 2. Validate status and expiration
    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}.`);
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      throw new Error("This invitation has expired.");
    }

    // 3. Verify user's email matches
    if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("Your email does not match the invitation email.");
    }

    // 4. Check if already a member
    const alreadyMember = await InvitationRepository.isWorkspaceMember(invitation.workspaceId, userId);
    if (alreadyMember) {
      // Assign project memberships if present
      const projectIdsToAssign = invitation.projectIds || [];
      if (projectIdsToAssign.length > 0) {
        await InvitationRepository.addProjectMembers(projectIdsToAssign, userId);
      }

      // Mark invitations as accepted
      await InvitationRepository.acceptPendingInvitations(invitation.workspaceId, invitation.email);

      // Create notification
      const recipients = new Set<string>();
      if (invitation.invitedBy) recipients.add(invitation.invitedBy);
      if (details.ownerId) recipients.add(details.ownerId);

      for (const recipientId of recipients) {
        await InvitationRepository.createNotification(
          recipientId,
          invitation.workspaceId,
          "Invitation Accepted",
          `${invitation.email} accepted the invitation to join ${details.workspaceName}.`,
          "invitation_accepted",
          userId
        );
      }

      return invitation.workspaceId;
    }

    // 5. Insert into workspace_members
    await InvitationRepository.addWorkspaceMember(invitation.workspaceId, userId, invitation.role);

    // 6. Insert into project_members
    const projectIdsToAssign = invitation.projectIds || [];
    if (projectIdsToAssign.length > 0) {
      await InvitationRepository.addProjectMembers(projectIdsToAssign, userId);
    }

    // 7. Update all pending invitations for this email in this workspace to accepted
    await InvitationRepository.acceptPendingInvitations(invitation.workspaceId, invitation.email);

    // 8. Create notification
    const recipients = new Set<string>();
    if (invitation.invitedBy) recipients.add(invitation.invitedBy);
    if (details.ownerId) recipients.add(details.ownerId);

    for (const recipientId of recipients) {
      await InvitationRepository.createNotification(
        recipientId,
        invitation.workspaceId,
        "Invitation Accepted",
        `${invitation.email} accepted the invitation to join ${details.workspaceName}.`,
        "invitation_accepted",
        userId
      );
    }

    return invitation.workspaceId;
  }

  /**
   * Reject/Decline an invitation.
   */
  static async rejectInvitation(token: string, userId: string, userEmail: string): Promise<void> {
    // 1. Fetch invitation details
    const details = await this.getInvitationByToken(token);
    if (!details) {
      throw new Error("Invitation not found.");
    }

    const { invitation } = details;

    // 2. Validate status and expiration
    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}.`);
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      throw new Error("This invitation has expired.");
    }

    // 3. Verify user's email matches
    if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("Your email does not match the invitation email.");
    }

    // 4. Update status to declined
    await InvitationRepository.updateInvitationStatusByToken(token, "declined");

    // 5. Create notifications
    const recipients = new Set<string>();
    if (invitation.invitedBy) recipients.add(invitation.invitedBy);
    if (details.ownerId) recipients.add(details.ownerId);

    for (const recipientId of recipients) {
      await InvitationRepository.createNotification(
        recipientId,
        invitation.workspaceId,
        "Invitation Declined",
        `${invitation.email} declined the invitation to join ${details.workspaceName}.`,
        "invitation_rejected",
        userId
      );
    }
  }

  /**
   * Get all pending invitations for a workspace.
   */
  static async getPendingInvitations(workspaceId: string): Promise<Invitation[]> {
    const rows = await InvitationRepository.getPendingInvitations(workspaceId);
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      email: row.email,
      role: row.role,
      token: row.token,
      status: row.status,
      invitedBy: row.invited_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      projectId: row.project_id,
      projectIds: row.project_ids || (row.project_id ? [row.project_id] : []),
    }));
  }

  /**
   * Revoke an invitation.
   */
  static async revokeInvitation(invitationId: string): Promise<void> {
    await InvitationRepository.revokeInvitation(invitationId);
  }
}
