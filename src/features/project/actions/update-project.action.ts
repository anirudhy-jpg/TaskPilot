"use server"

import { revalidatePath } from "next/cache"
import { ProjectService } from "../services/project.service"
import { UpdateProjectSchema } from "@/lib/validations/project.schema"

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
    const result = UpdateProjectSchema.safeParse({ name, description })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }

    await ProjectService.updateProject(projectId, result.data.name, result.data.description)
    revalidatePath("/workspace")
    revalidatePath("/projects", "layout")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update project."
    return { success: false, error: message }
  }
}
