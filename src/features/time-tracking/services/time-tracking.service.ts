import { createClient } from "@/lib/supabase/server";
import type { TimeEntry, TaskTimeStats } from "../types";

export class TimeTrackingService {
  /**
   * Starts a timer for a given task. Stops any currently running timer.
   */
  static async startTimer(taskId: string): Promise<TimeEntry> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // 1. Find active timer
    const { data: activeTimers } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .is("end_time", null);

    if (activeTimers && activeTimers.length > 0) {
      // 2. Stop active timers
      const now = new Date().toISOString();
      for (const active of activeTimers) {
        const start = new Date(active.start_time).getTime();
        const duration = Math.floor((new Date(now).getTime() - start) / 1000);
        await supabase
          .from("time_entries")
          .update({
            end_time: now,
            duration_seconds: duration,
          })
          .eq("id", active.id);
      }
    }

    // 3. Create new timer
    const { data: newEntry, error } = await supabase
      .from("time_entries")
      .insert({
        task_id: taskId,
        user_id: user.id,
        start_time: new Date().toISOString(),
      })
      .select(`
        *,
        user:profiles!time_entries_user_id_fkey(id, email, full_name, avatar_url),
        task:tasks(id, title, project:projects(id, workspace:workspaces(id, name)))
      `)
      .single();

    if (error) {
      console.error("Error starting timer:", error);
      throw new Error(error.message);
    }

    return newEntry as unknown as TimeEntry;
  }

  /**
   * Stops the currently active timer for the user.
   */
  static async stopActiveTimer(): Promise<TimeEntry | null> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: activeTimer, error: fetchError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .is("end_time", null)
      .maybeSingle();

    if (fetchError || !activeTimer) {
      return null;
    }

    const now = new Date().toISOString();
    const start = new Date(activeTimer.start_time).getTime();
    const duration = Math.floor((new Date(now).getTime() - start) / 1000);

    const { data: updatedEntry, error: updateError } = await supabase
      .from("time_entries")
      .update({
        end_time: now,
        duration_seconds: duration,
      })
      .eq("id", activeTimer.id)
      .select(`
        *,
        user:profiles!time_entries_user_id_fkey(id, email, full_name, avatar_url),
        task:tasks(id, title, project:projects(id, workspace:workspaces(id, name)))
      `)
      .single();

    if (updateError) {
      console.error("Error stopping timer:", updateError);
      throw new Error(updateError.message);
    }

    return updatedEntry as unknown as TimeEntry;
  }

  /**
   * Fetches the currently active timer for the user.
   */
  static async getActiveTimer(): Promise<TimeEntry | null> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: activeTimer, error } = await supabase
      .from("time_entries")
      .select(`
        *,
        user:profiles!time_entries_user_id_fkey(id, email, full_name, avatar_url),
        task:tasks(id, title, project:projects(id, workspace:workspaces(id, name)))
      `)
      .eq("user_id", user.id)
      .is("end_time", null)
      .maybeSingle();

    if (error) {
      console.error("Error fetching active timer:", error);
      return null;
    }

    return activeTimer as unknown as TimeEntry | null;
  }

  /**
   * Fetches all completed time entries for a given task.
   */
  static async getTaskTimeEntries(taskId: string): Promise<TimeEntry[]> {
    const supabase = await createClient();

    const { data: entries, error } = await supabase
      .from("time_entries")
      .select(`
        *,
        user:profiles!time_entries_user_id_fkey(id, email, full_name, avatar_url),
        task:tasks(id, title, project:projects(id, workspace:workspaces(id, name)))
      `)
      .eq("task_id", taskId)
      .not("end_time", "is", null)
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching task time entries:", error);
      throw new Error(error.message);
    }

    return entries as unknown as TimeEntry[];
  }

  /**
   * Logs manual time for a task.
   */
  static async logManualTime(
    taskId: string,
    durationSeconds: number,
    note?: string
  ): Promise<TimeEntry> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const end = new Date();
    const start = new Date(end.getTime() - durationSeconds * 1000);

    const { data: newEntry, error } = await supabase
      .from("time_entries")
      .insert({
        task_id: taskId,
        user_id: user.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_seconds: durationSeconds,
        note: note || null,
      })
      .select(`
        *,
        user:profiles!time_entries_user_id_fkey(id, email, full_name, avatar_url),
        task:tasks(id, title, project:projects(id, workspace:workspaces(id, name)))
      `)
      .single();

    if (error) {
      console.error("Error logging manual time:", error);
      throw new Error(error.message);
    }

    return newEntry as unknown as TimeEntry;
  }

  /**
   * Deletes a time entry.
   */
  static async deleteTimeEntry(entryId: string): Promise<void> {
    const supabase = await createClient();
    // Application level check can be added here if needed to ensure only author or admin can delete
    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      console.error("Error deleting time entry:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Updates the note for a time entry.
   */
  static async updateTimeEntryNote(entryId: string, note: string | null): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("time_entries")
      .update({ note })
      .eq("id", entryId);

    if (error) {
      console.error("Error updating time entry note:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Fetches stats for a task: tracked time vs estimated.
   */
  static async getTaskTimeStats(taskId: string): Promise<TaskTimeStats> {
    const supabase = await createClient();

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, estimated_minutes")
      .eq("id", taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task stats:", taskError);
      throw new Error(taskError.message);
    }

    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select("duration_seconds")
      .eq("task_id", taskId)
      .not("end_time", "is", null);

    if (entriesError) {
      console.error("Error fetching entries for stats:", entriesError);
      throw new Error(entriesError.message);
    }

    const totalSeconds = (entries || []).reduce(
      (sum, entry) => sum + (entry.duration_seconds || 0),
      0
    );

    return {
      taskId: task.id,
      estimatedMinutes: task.estimated_minutes || 0,
      trackedSeconds: totalSeconds,
    };
  }

  /**
   * Update task estimated time
   */
  static async updateTaskEstimate(taskId: string, estimatedMinutes: number): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ estimated_minutes: estimatedMinutes })
      .eq("id", taskId);

    if (error) {
      console.error("Error updating task estimate:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Instantly validates an active timer. If the user has lost access 
   * (task deleted, project deleted, workspace deleted, or user removed),
   * stops the timer immediately and logs the activity.
   * @param forceStopReason If provided, forces the timer to stop (useful before cascading deletes).
   */
  static async validateAndStopInvalidActiveTimers(userId: string, forceStopReason?: string): Promise<boolean> {
    const supabase = await createClient();

    // 1. Fetch active timer with full chain
    const { data: activeTimer, error: fetchError } = await supabase
      .from("time_entries")
      .select(`
        id, start_time, task_id,
        task:tasks(
          id,
          project:projects(
            id,
            workspace_id,
            workspace:workspaces(id)
          )
        )
      `)
      .eq("user_id", userId)
      .is("end_time", null)
      .maybeSingle();

    if (fetchError || !activeTimer) {
      return false; // No active timer to stop
    }

    // 2. Validate all levels
    let isValid = true;
    const stopReason = forceStopReason || "System automatically stopped timer because access was revoked.";
    
    if (forceStopReason) {
      isValid = false;
    } else {
      const task = activeTimer.task as unknown as {
        id: string;
        project?: {
          id: string;
          workspace_id: string;
          workspace?: { id: string } | null;
        } | null;
      } | null;

      if (!task) {
        isValid = false; // Task deleted
      } else if (!task.project) {
        isValid = false; // Project deleted
      } else if (!task.project.workspace) {
        isValid = false; // Workspace deleted
      } else {
        // Check membership
        const { data: member } = await supabase
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", task.project.workspace_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!member) {
          isValid = false; // User removed from workspace
        }
      }
    }

    if (!isValid) {
      // 3. Stop timer
      const now = new Date().toISOString();
      const start = new Date(activeTimer.start_time).getTime();
      const duration = Math.floor((new Date(now).getTime() - start) / 1000);

      const { error: updateError } = await supabase
        .from("time_entries")
        .update({
          end_time: now,
          duration_seconds: duration,
        })
        .eq("id", activeTimer.id);

      if (updateError) {
        console.error("Failed to automatically stop invalid timer", updateError);
        return false;
      }

      // 4. Create Activity Log (only if task exists, otherwise task_activities will fail due to fkey)
      if (activeTimer.task_id && activeTimer.task) {
        await supabase.from("task_activities").insert({
          task_id: activeTimer.task_id,
          actor_id: null, // System action
          action_type: "COMMENT_ADDED", // Using comment as a fallback for system logs
          metadata: {
            systemLog: true,
            message: stopReason,
          },
        });
      }
      return true; // Timer was invalidated and stopped
    }

    return false; // Timer is valid
  }
}
