import { rejectInvitationAction } from "@/features/invitations/actions/reject-invitation.action";

export async function declineInvitationAction(token: string) {
  return rejectInvitationAction(token);
}
