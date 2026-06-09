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

    const { data: projectsData, error } = await supabase
      .from("projects")
      .select("id, workspace_id, name, description, created_by, created_at, profiles:created_by(email, full_name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching projects:", error)
      throw new Error(error.message)
    }

    if (!projectsData || projectsData.length === 0) {
      return []
    }

    // Filter projects based on user permissions
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch workspace owner
        const { data: ws } = await supabase
          .from("workspaces")
          .select("owner_id")
          .eq("id", workspaceId)
          .maybeSingle()

        // Fetch workspace member role
        const { data: memberInfo } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .maybeSingle()

        const isOwner = ws?.owner_id === user.id
        const isAdmin = memberInfo?.role === "admin"

        // If they are a regular member, filter projects to only those they are assigned to or created
        if (!isOwner && !isAdmin) {
          const { data: projectMembers } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("user_id", user.id)

          const assignedProjectIds = new Set((projectMembers || []).map((pm) => pm.project_id))
          return projectsData
            .filter((project) => assignedProjectIds.has(project.id) || project.created_by === user.id)
            .map(mapProject)
        }
      }
    } catch (filterErr) {
      console.error("Error filtering projects for user:", filterErr)
    }

    return projectsData.map(mapProject)
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error("Unauthorized")
    }

    // Check permissions: Anyone who is a member or owner of the workspace can create projects
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle()

    const { data: memberInfo } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle()

    const isOwner = ws?.owner_id === user.id
    const isMember = memberInfo !== null

    if (!isOwner && !isMember) {
      throw new Error("Unauthorized: Only workspace members can create projects.")
    }

    // Only include columns that are guaranteed to exist
    const insertData: Record<string, unknown> = {
      workspace_id: workspaceId,
      name,
      created_by: user.id
    }
    if (description) insertData.description = description

    const { data, error } = await supabase
      .from("projects")
      .insert(insertData)
      .select("id, workspace_id, name, description, created_by, created_at")
      .single()

    if (error) {
      console.error("Error creating project:", error)
      throw new Error(error.message)
    }

    // Auto-assign project creator to project_members table
    try {
      const { error: pmError } = await supabase
        .from("project_members")
        .insert({
          project_id: data.id,
          user_id: user.id,
          role: "member"
        })

      if (pmError) {
        console.error("Failed to auto-assign creator to project members:", pmError.message)
      }
    } catch (pmErr) {
      console.error("Exception during creator project member auto-assignment:", pmErr)
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
      .select("id, workspace_id, name, description, created_by, created_at, profiles:created_by(email, full_name)")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching project:", error)
      throw new Error(error.message)
    }

    if (!data) return null

    // Filter project access if user is regular member
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("owner_id")
          .eq("id", data.workspace_id)
          .maybeSingle()

        const { data: memberInfo } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", data.workspace_id)
          .eq("user_id", user.id)
          .maybeSingle()

        const isOwner = ws?.owner_id === user.id
        const isAdmin = memberInfo?.role === "admin"

        if (!isOwner && !isAdmin) {
          const { data: isProjMem } = await supabase
            .from("project_members")
            .select("id")
            .eq("project_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle()

          if (!isProjMem && data.created_by !== user.id) {
            return null // Not allowed to access this project
          }
        }
      }
    } catch (filterErr) {
      console.error("Error validating project access for user:", filterErr)
    }

    return mapProject(data)
  }

  /**
   * Delete a project by ID.
   */
  static async deleteProject(id: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized")
    }

    // Fetch project to find its workspace and creator
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("workspace_id, created_by")
      .eq("id", id)
      .maybeSingle()

    if (projErr || !project) {
      throw new Error("Project not found")
    }

    // Check permissions: Only workspace owners/admins or the project creator can delete
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", project.workspace_id)
      .maybeSingle()

    const { data: memberInfo } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle()

    const isWorkspaceOwner = ws?.owner_id === user.id
    const isWorkspaceAdmin = memberInfo?.role === "admin" || memberInfo?.role === "owner"
    const isProjectCreator = project.created_by === user.id

    if (!isWorkspaceOwner && !isWorkspaceAdmin && !isProjectCreator) {
      throw new Error("Unauthorized: Only workspace admins or the project creator can delete this project.")
    }

    const { error } = await supabase.from("projects").delete().eq("id", id)

    if (error) {
      console.error("Error deleting project:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Get all user IDs of members assigned to a project.
   */
  static async getProjectMemberUserIds(projectId: string): Promise<string[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)

    if (error) {
      console.error("Error fetching project member user IDs:", error)
      return []
    }
    return (data || []).map((row) => row.user_id)
  }
}

// ─── Helpers ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProject(row: any): Project {
  const creatorProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status || "active",
    createdAt: row.created_at,
    createdBy: row.created_by,
    creatorEmail: creatorProfile?.email || null,
    creatorName: creatorProfile?.full_name || null,
  }
}
