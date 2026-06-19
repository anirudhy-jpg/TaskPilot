import { createClient } from "@/lib/supabase/server";
import type { Project } from "../types/project.types";

export class ProjectService {
  static async getProjectsByWorkspace(
    workspaceId: string,
    userId?: string,
    userRole?: string
  ): Promise<Project[]> {
    const supabase = await createClient();

    // 1. Fetch projects along with their project members (for regular member filtering) in one query
    const { data: projectsData, error } = await supabase
      .from("projects")
      .select(`
        id,
        workspace_id,
        name,
        description,
        created_by,
        created_at,
        profiles:created_by(email, full_name),
        project_members!left(user_id)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      throw new Error(error.message);
    }

    if (!projectsData || projectsData.length === 0) {
      return [];
    }

    // 2. Identify the active user ID
    let activeUserId = userId;
    if (!activeUserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        activeUserId = user?.id;
      } catch (err) {
        console.error("Error retrieving user inside getProjectsByWorkspace:", err);
      }
    }

    // 3. Filter projects based on user permissions
    if (activeUserId) {
      try {
        let role = userRole;
        if (!role) {
          // Fetch user workspace role (owner is registered as 'owner' member row)
          const { data: memberInfo } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", activeUserId)
            .maybeSingle();
          role = memberInfo?.role;
        }

        const isOwner = role === "owner";
        const isAdmin = role === "admin";

        // If regular member, only return projects they created or are assigned to
        if (!isOwner && !isAdmin) {
          return projectsData
            .filter((project: Record<string, unknown>) => {
              const isCreator = project.created_by === activeUserId;
              const isAssigned = ((project.project_members as Record<string, unknown>[]) || []).some(
                (pm: Record<string, unknown>) => pm.user_id === activeUserId
              );
              return isCreator || isAssigned;
            })
            .map(mapProject);
        }
      } catch (filterErr) {
        console.error("Error filtering projects for user:", filterErr);
      }
    }

    return projectsData.map(mapProject);
  }


  /**
   * Create a new project inside a workspace.
   */
  static async createProject(
    workspaceId: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check permissions: Only workspace owners and admins can create projects
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    const { data: memberInfo } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isOwner = ws?.owner_id === user.id;
    const userRole = memberInfo?.role || (isOwner ? "owner" : null);

    if (userRole === "member" || !userRole) {
      throw new Error(
        "Unauthorized: Workspace members are not allowed to create projects.",
      );
    }

    // Only include columns that are guaranteed to exist
    const insertData: Record<string, unknown> = {
      workspace_id: workspaceId,
      name,
      created_by: user.id,
    };
    if (description) insertData.description = description;

    const { data, error } = await supabase
      .from("projects")
      .insert(insertData)
      .select("id, workspace_id, name, description, created_by, created_at")
      .single();

    if (error) {
      console.error("Error creating project:", error);
      throw new Error(error.message);
    }

    // Auto-assign project creator and workspace admins to project_members table
    try {
      const { data: adminMembers } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .in("role", ["admin", "owner"]);

      const membersToAssign = new Set<string>();
      membersToAssign.add(user.id);
      
      if (adminMembers) {
         adminMembers.forEach(m => membersToAssign.add(m.user_id));
      }

      // Also add the workspace owner specifically, just in case they aren't in workspace_members (though they should be)
      if (ws?.owner_id) {
         membersToAssign.add(ws.owner_id);
      }

      const inserts = Array.from(membersToAssign).map(uid => ({
        project_id: data.id,
        user_id: uid,
      }));

      const { error: pmError } = await supabase.from("project_members").insert(inserts);

      if (pmError) {
        console.error(
          "Failed to auto-assign creator and admins to project members:",
          pmError.message,
        );
      }
    } catch (pmErr) {
      console.error(
        "Exception during project member auto-assignment:",
        pmErr,
      );
    }

    // Seed default columns for the new project
    try {
      const defaultCols = [
        { board_id: data.id, name: "To Do", position: 1000.0 },
        { board_id: data.id, name: "In Progress", position: 2000.0 },
        { board_id: data.id, name: "Done", position: 3000.0 },
      ];
      const { error: colError } = await supabase
        .from("columns")
        .insert(defaultCols);

      if (colError) {
        console.error(
          "Failed to seed default columns for new project:",
          colError.message,
        );
      }
    } catch (colErr) {
      console.error("Exception during project column seeding:", colErr);
    }

    return mapProject(data);
  }

  /**
   * Get a single project by ID.
   */
  static async getProjectById(id: string): Promise<Project | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, workspace_id, name, description, created_by, created_at, profiles:created_by(email, full_name)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching project:", error);
      throw new Error(error.message);
    }

    if (!data) return null;

    // Filter project access if user is regular member
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("owner_id")
          .eq("id", data.workspace_id)
          .maybeSingle();

        const { data: memberInfo } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", data.workspace_id)
          .eq("user_id", user.id)
          .maybeSingle();

        const isOwner = ws?.owner_id === user.id;
        const isAdmin = memberInfo?.role === "admin";

        if (!isOwner && !isAdmin) {
          const { data: isProjMem } = await supabase
            .from("project_members")
            .select("id")
            .eq("project_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!isProjMem && data.created_by !== user.id) {
            return null; // Not allowed to access this project
          }
        }
      }
    } catch (filterErr) {
      console.error("Error validating project access for user:", filterErr);
    }

    return mapProject(data);
  }

  /**
   * Update project details.
   */
  static async updateProject(
    id: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const updateData: Record<string, unknown> = {
      name,
      description: description || null,
    };

    const { data, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", id)
      .select("id, workspace_id, name, description, created_by, created_at")
      .single();

    if (error) {
      console.error("Error updating project:", error);
      throw new Error(error.message);
    }

    return mapProject(data);
  }

  /**
   * Delete a project by ID.
   */
  static async deleteProject(id: string): Promise<void> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Fetch project to find its workspace and creator
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("workspace_id, created_by")
      .eq("id", id)
      .maybeSingle();

    if (projErr || !project) {
      throw new Error("Project not found");
    }

    // Check permissions: Only workspace owners and admins can delete projects
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", project.workspace_id)
      .maybeSingle();

    const { data: memberInfo } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isWorkspaceOwner = ws?.owner_id === user.id;
    const userRole =
      memberInfo?.role || (isWorkspaceOwner ? "owner" : "member");

    if (userRole === "member") {
      throw new Error(
        "Unauthorized: Workspace members are not allowed to delete projects.",
      );
    }

    const isWorkspaceAdmin = userRole === "admin" || userRole === "owner";
    const isProjectCreator = project.created_by === user.id;

    if (!isWorkspaceOwner && !isWorkspaceAdmin && !isProjectCreator) {
      throw new Error(
        "Unauthorized: Only workspace admins or the project creator can delete this project.",
      );
    }

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.error("Error deleting project:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Get all user IDs of members assigned to a project.
   */
  static async getProjectMemberUserIds(projectId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId);

    if (error) {
      console.error("Error fetching project member user IDs:", error);
      return [];
    }
    return (data || []).map((row) => row.user_id);
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function mapProject(row: Record<string, unknown>): Project {
  const profiles = row.profiles as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const creatorProfile = Array.isArray(profiles)
    ? profiles[0]
    : profiles;
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: (row.description as string | null | undefined) ?? null,
    status: ((row.status as string) || "active") as import("../types/project.types").ProjectStatus,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string,
    creatorEmail: (creatorProfile?.email as string) || null,
    creatorName: (creatorProfile?.full_name as string) || null,
  };
}
