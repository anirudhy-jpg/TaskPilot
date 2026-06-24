"use server"

import { TaskService } from "../services/task.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function deleteTaskAction(
  taskId: string
): Promise<ActionResponse> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    // 1. Find all users with an active timer for this task BEFORE deleting it
    const { data: activeTimers } = await supabase
      .from("time_entries")
      .select("user_id")
      .eq("task_id", taskId)
      .is("end_time", null)

    // 2. Stop those timers before they get potentially cascade-deleted
    if (activeTimers && activeTimers.length > 0) {
      const { TimeTrackingService } = await import("@/features/time-tracking/services/time-tracking.service")
      for (const timer of activeTimers) {
        await TimeTrackingService.validateAndStopInvalidActiveTimers(
          timer.user_id, 
          "System automatically stopped timer because the task was deleted."
        )
      }
    }

    // 3. Now delete the task
    await TaskService.deleteTask(taskId)

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete task."
    return {
      success: false,
      error: message,
    }
  }
}
