"use server"

import { TaskTimelineService } from "../services/task-timeline.service"
import type { TimelineItem } from "@/features/project/types/project.types"

export async function getTaskTimelineAction(taskId: string, limit = 50): Promise<TimelineItem[]> {
  try {
    return await TaskTimelineService.getTaskTimeline(taskId, limit)
  } catch (error) {
    console.error("Failed to fetch task timeline:", error)
    return []
  }
}
