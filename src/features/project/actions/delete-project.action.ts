"use server"

import { ProjectService } from "../services/project.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function deleteProjectAction(
  projectId: string
): Promise<ActionResponse> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    // 1. Find all users with an active timer for tasks in this project
    const { data: activeTimers } = await supabase
      .from("time_entries")
      .select(`
        user_id,
        task:tasks!inner(project_id)
      `)
      .eq("task.project_id", projectId)
      .is("end_time", null)

    // 2. Stop those timers before they get potentially cascade-deleted
    if (activeTimers && activeTimers.length > 0) {
      const { TimeTrackingService } = await import("@/features/time-tracking/services/time-tracking.service")
      for (const timer of activeTimers) {
        await TimeTrackingService.validateAndStopInvalidActiveTimers(
          timer.user_id, 
          "System automatically stopped timer because the project was deleted."
        )
      }
    }

    // 3. Delete the project
    await ProjectService.deleteProject(projectId)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete project."
    return {
      success: false,
      error: message,
    }
  }
}
