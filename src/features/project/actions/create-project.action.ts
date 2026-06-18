"use server"

import { revalidatePath } from "next/cache"
import { ProjectService } from "../services/project.service"
import { CreateProjectSchema } from "@/lib/validations/project.schema"

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
    const result = CreateProjectSchema.safeParse({ workspaceId, name, description })
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message }
    }

    const project = await ProjectService.createProject(result.data.workspaceId, result.data.name, result.data.description)
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
