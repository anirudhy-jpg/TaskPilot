"use server"

// Removed revalidatePath import
import { TaskService } from "../services/task.service"
import type { Task } from "@/features/project/types/project.types"
import { CreateTaskSchema, type CreateTaskInput } from "@/lib/validations/task.schema"
import { requireUser } from "@/lib/supabase/server"
import { createNotification } from "@/lib/notifications/notification.service"

export interface ActionResponse {
  success: boolean
  error?: string
  task?: Task
}

export async function createTaskAction(
  input: CreateTaskInput
): Promise<ActionResponse> {
  try {
    const result = CreateTaskSchema.safeParse(input)
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }

    const { supabase, user } = await requireUser()

    const task = await TaskService.createTask(result.data)

    // Notify assignee if one was set and it's not the task creator
    if (result.data.assigneeId && result.data.assigneeId !== user.id) {
      const [{ data: actorProfile }, { data: projectData }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabase.from("projects").select("name, workspace_id").eq("id", result.data.projectId).maybeSingle(),
      ])

      const actorName = actorProfile?.full_name || actorProfile?.email || "Someone"

      await createNotification({
        userId: result.data.assigneeId,
        workspaceId: projectData?.workspace_id,
        title: "Task assigned to you",
        message: `${actorName} assigned you to "${result.data.title}"${projectData ? ` in project "${projectData.name}"` : ""}.`,
        type: "task_assigned",
        actorId: user.id,
        client: supabase,
      })
    }

    return { success: true, task }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create task."
    return {
      success: false,
      error: message,
    }
  }
}
