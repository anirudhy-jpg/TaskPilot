"use server";

import { TimeTrackingService } from "../services/time-tracking.service";
import type { TimeEntry, TaskTimeStats } from "../types";

export async function startTimerAction(taskId: string): Promise<TimeEntry> {
  try {
    return await TimeTrackingService.startTimer(taskId);
  } catch (error) {
    console.error("Failed to start timer:", error);
    throw new Error("Failed to start timer");
  }
}

export async function stopActiveTimerAction(): Promise<TimeEntry | null> {
  try {
    return await TimeTrackingService.stopActiveTimer();
  } catch (error) {
    console.error("Failed to stop timer:", error);
    throw new Error("Failed to stop timer");
  }
}

export async function getActiveTimerAction(): Promise<TimeEntry | null> {
  try {
    return await TimeTrackingService.getActiveTimer();
  } catch (error) {
    console.error("Failed to get active timer:", error);
    return null;
  }
}

export async function getTaskTimeEntriesAction(taskId: string): Promise<TimeEntry[]> {
  try {
    return await TimeTrackingService.getTaskTimeEntries(taskId);
  } catch (error) {
    console.error("Failed to get task time entries:", error);
    throw new Error("Failed to get task time entries");
  }
}

export async function logManualTimeAction(
  taskId: string,
  durationSeconds: number,
  note?: string
): Promise<TimeEntry> {
  try {
    return await TimeTrackingService.logManualTime(taskId, durationSeconds, note);
  } catch (error) {
    console.error("Failed to log manual time:", error);
    throw new Error("Failed to log manual time");
  }
}

export async function deleteTimeEntryAction(entryId: string): Promise<void> {
  try {
    return await TimeTrackingService.deleteTimeEntry(entryId);
  } catch (error) {
    console.error("Failed to delete time entry:", error);
    throw new Error("Failed to delete time entry");
  }
}

export async function getTaskTimeStatsAction(taskId: string): Promise<TaskTimeStats> {
  try {
    return await TimeTrackingService.getTaskTimeStats(taskId);
  } catch (error) {
    console.error("Failed to get task time stats:", error);
    throw new Error("Failed to get task time stats");
  }
}

export async function updateTaskEstimateAction(taskId: string, estimatedMinutes: number): Promise<void> {
  try {
    await TimeTrackingService.updateTaskEstimate(taskId, estimatedMinutes);
  } catch (error) {
    console.error("Failed to update task estimate:", error);
    throw new Error("Failed to update task estimate");
  }
}
