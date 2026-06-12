"use server"

import { revalidatePath } from "next/cache"
import { ProjectService } from "../services/project.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function updateProjectAction(
  projectId: string,
  name: string,
  description?: string
): Promise<ActionResponse> {
  try {
    await ProjectService.updateProject(projectId, name, description)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update project."
    return { success: false, error: message }
  }
}
