import { createClient } from "@/lib/supabase/server"
import type { Project } from "@/types/workspace.types"

export class ProjectService {
  /**
   * Get all projects in a workspace.
   */
  static async getProjectsByWorkspace(
    workspaceId: string
  ): Promise<Project[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("projects")
      .select("id, workspace_id, name, description, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching projects:", error)
      throw new Error(error.message)
    }

    return (data || []).map(mapProject)
  }

  /**
   * Create a new project inside a workspace.
   */
  static async createProject(
    workspaceId: string,
    name: string,
    description?: string
  ): Promise<Project> {
    const supabase = await createClient()

    // Only include columns that are guaranteed to exist
    const insertData: Record<string, unknown> = {
      workspace_id: workspaceId,
      name,
    }
    if (description) insertData.description = description

    const { data, error } = await supabase
      .from("projects")
      .insert(insertData)
      .select("id, workspace_id, name, description, created_at")
      .single()

    if (error) {
      console.error("Error creating project:", error)
      throw new Error(error.message)
    }

    return mapProject(data)
  }

  /**
   * Get a single project by ID.
   */
  static async getProjectById(id: string): Promise<Project | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("projects")
      .select("id, workspace_id, name, description, created_at")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching project:", error)
      throw new Error(error.message)
    }

    return data ? mapProject(data) : null
  }

  /**
   * Delete a project by ID.
   */
  static async deleteProject(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from("projects").delete().eq("id", id)

    if (error) {
      console.error("Error deleting project:", error)
      throw new Error(error.message)
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProject(row: any): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status || "active",
    createdAt: row.created_at,
  }
}
