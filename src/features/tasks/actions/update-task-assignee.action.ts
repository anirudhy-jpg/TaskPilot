"use server"

import { TaskService } from "../services/task.service"
import { requireUser } from "@/lib/supabase/server"
import { createNotification } from "@/lib/notifications/notification.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateTaskAssigneeAction(
  taskId: string,
  assigneeId: string | null
): Promise<ActionResponse> {
  try {
    const { supabase, user } = await requireUser()

    // Only send notification if we're assigning (not un-assigning) and it's a different user
    if (assigneeId && assigneeId !== user.id) {
      // Fetch task + project info for the notification message
      const [{ data: task }, { data: actorProfile }] = await Promise.all([
        supabase
          .from("tasks")
          .select("title, project_id, projects(workspace_id, name)")
          .eq("id", taskId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle(),
      ])

      type TaskWithProject = {
        title: string
        project_id: string
        projects: { workspace_id: string; name: string } | { workspace_id: string; name: string }[] | null
      }
      const typedTask = task as TaskWithProject | null

      if (typedTask) {
        const projectRaw = typedTask.projects
        const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw
        const actorName = actorProfile?.full_name || actorProfile?.email || "Someone"

        await createNotification({
          userId: assigneeId,
          workspaceId: project?.workspace_id,
          title: "Task assigned to you",
          message: `${actorName} assigned you to "${typedTask.title}"${project ? ` in project "${project.name}"` : ""}.`,
          type: "task_assigned",
          actorId: user.id,
          client: supabase,
        })
      }
    }

    await TaskService.updateTaskAssignee(taskId, assigneeId)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task assignee."
    return {
      success: false,
      error: message,
    }
  }
}
