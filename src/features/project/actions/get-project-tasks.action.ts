"use server"

import { TaskService } from "@/features/tasks/services/task.service"
import { ColumnService } from "@/features/kanbanboard/services/column.service"
import type { Task, Column } from "@/features/project/types/project.types"

export interface ProjectTasksResponse {
  success: boolean
  tasks?: Task[]
  columns?: Column[]
  error?: string
}

export async function getProjectTasksAction(projectId: string): Promise<ProjectTasksResponse> {
  try {
    const [tasks, columns] = await Promise.all([
      TaskService.getTasksByProject(projectId),
      ColumnService.getColumnsByProject(projectId),
    ])
    return { success: true, tasks, columns }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load project tasks."
    return { success: false, error: message }
  }
}
