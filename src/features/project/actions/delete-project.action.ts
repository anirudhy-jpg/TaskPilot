"use server"

import { revalidatePath } from "next/cache"
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
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete project."
    return {
      success: false,
      error: message,
    }
  }
}
