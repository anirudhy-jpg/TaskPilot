"use server";

import { revalidatePath } from "next/cache";
import { requireUser, createClient } from "@/lib/supabase/server";
import { AddProjectMemberSchema } from "@/lib/validations/project.schema";
import { createNotification } from "@/lib/notifications/notification.service";
import { MessagingService } from "@/features/messages/services/messaging.service";

export interface ActionResponse {
  success: boolean;
  error?: string;
}

export async function addProjectMemberAction(
  projectId: string,
  userId: string,
): Promise<ActionResponse> {
  try {
    const result = AddProjectMemberSchema.safeParse({ userId })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }
    const validatedUserId = result.data.userId;

    const { user } = await requireUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();

    // 1. Get project to check workspace ID
    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // 2. Verify that current user is the owner or admin of this workspace
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", project.workspace_id)
      .maybeSingle();

    let isAuthorized = false;
    if (ws && ws.owner_id === user.id) {
      isAuthorized = true;
    } else {
      const { data: memberInfo } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (memberInfo && (memberInfo.role === "admin" || memberInfo.role === "owner")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return {
        success: false,
        error:
          "Unauthorized: Only workspace owners and admins can add members to projects.",
      };
    }

    // 3. Verify target user is indeed a member of this workspace
    const { data: isMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", validatedUserId)
      .maybeSingle();

    if (!isMember) {
      return {
        success: false,
        error: "This user is not a member of the workspace.",
      };
    }

    // 4. Insert project member
    const { error: insertErr } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: validatedUserId,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return {
          success: false,
          error: "User is already assigned to this project.",
        };
      }
      throw insertErr;
    }

    // 5. Fire inbox notification to the added member
    const [{ data: projectData }, { data: actorProfile }, { data: targetProfile }] = await Promise.all([
      supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
      supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name, email").eq("id", validatedUserId).maybeSingle(),
    ]);

    const projectName = projectData?.name ?? "a project";
    const actorName = actorProfile?.full_name || actorProfile?.email || "A workspace admin";
    const targetName = targetProfile?.full_name || targetProfile?.email || "Someone";

    await createNotification({
      userId: validatedUserId,
      workspaceId: project.workspace_id,
      title: "Added to project",
      message: `${actorName} added ${targetName} to "${projectName}".`,
      type: "project_member_added",
      actorId: user.id,
      client: supabase,
    });

    // 6. Refresh messaging conversation statuses
    await MessagingService.refreshConversationStatuses(project.workspace_id, validatedUserId);

    revalidatePath("/projects", "layout");
    revalidatePath("/workspace");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error in addProjectMemberAction:", error);
    const message =
      (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error instanceof Error ? error.message : "Failed to add member to project.");
    return { success: false, error: message };
  }
}
