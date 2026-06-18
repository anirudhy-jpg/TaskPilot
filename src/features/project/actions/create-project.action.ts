"use server"

import { revalidatePath } from "next/cache"
import { ProjectService } from "../services/project.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function createProjectAction(
  workspaceId: string,
  name: string,
  description?: string
): Promise<ActionResponse & { projectId?: string }> {
  try {
    const project = await ProjectService.createProject(workspaceId, name, description)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true, projectId: project.id }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create project."
    return {
      success: false,
      error: message,
    }
  }
}
