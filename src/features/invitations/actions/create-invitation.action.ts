"use server"

import { revalidatePath } from "next/cache";
import { InviteService } from "../services/invite.service";
import { requireUser } from "@/lib/supabase/server";
import { CreateInvitationSchema } from "@/lib/validations/workspace.schema";

export interface CreateInvitationResponse {
  success: boolean;
  emailSent?: boolean;
  data?: string;
  error?: string;
}

/**
 * Server action to create a workspace invitation and send it via SendGrid.
 */
export async function createInvitationAction(
  workspaceId: string,
  email: string,
  role: "admin" | "member",
  projectIds: string[]
): Promise<CreateInvitationResponse> {
  try {
    const result = CreateInvitationSchema.safeParse({ workspaceId, email, role, projectIds })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }
    const { workspaceId: vWorkspaceId, email: vEmail, role: vRole, projectIds: vProjectIds } = result.data;

    const { user } = await requireUser();
    if (!user) {
      return { success: false, error: "You must be logged in to invite members." };
    }

    if (vRole === "member" && (!vProjectIds || vProjectIds.length === 0)) {
      return { success: false, error: "Project assignment is required for workspace members." };
    }

    const res = await InviteService.createInvitation(
      vWorkspaceId,
      vEmail,
      vRole,
      user.id,
      vProjectIds || []
    );

    revalidatePath("/members");
    return {
      success: true,
      emailSent: res.emailSent,
      data: res.data,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create invitation.";
    return {
      success: false,
      error: message,
    };
  }
}
