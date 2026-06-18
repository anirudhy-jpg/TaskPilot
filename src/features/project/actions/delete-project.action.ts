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
