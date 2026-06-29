import { createClient } from "@/lib/supabase/server";
import { PermissionsService } from "@/lib/permissions";
import type { Project } from "../types/project.types";

export class ProjectService {
  static async getProjectsByWorkspace(
    workspaceId: string,
    userId?: string,
    userRole?: string
  ): Promise<Project[]> {
    const supabase = await createClient();

    // 1. Identify the active user ID
    let activeUserId = userId;
    if (!activeUserId) {
      activeUserId = await PermissionsService.getCurrentUserId(supabase).catch(() => undefined);
    }
    
    if (!activeUserId) {
      return [];
    }

    // 2. Identify the user role
    let role = userRole;
    if (!role) {
      role = await PermissionsService.getWorkspaceRole(supabase, activeUserId, workspaceId) || undefined;
    }

    const isOwnerOrAdmin = role === "owner" || role === "admin";

    let projectsData;
    
    // 3. Backend-filtered query based on role
    if (isOwnerOrAdmin) {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id,
          workspace_id,
          name,
          description,
          created_by,
          created_at,
          profiles:created_by(email, full_name)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      projectsData = data;
    } else {
      // Members only see projects they created or are assigned to
      // We use two queries and merge them to avoid complex OR logic which can be tricky in PostgREST
      
      const { data: createdProjects, error: err1 } = await supabase
        .from("projects")
        .select(`
          id,
          workspace_id,
          name,
          description,
          created_by,
          created_at,
          profiles:created_by(email, full_name)
        `)
        .eq("workspace_id", workspaceId)
        .eq("created_by", activeUserId)
        .order("created_at", { ascending: false });
        
      if (err1) throw new Error(err1.message);
      
      const { data: assignedProjects, error: err2 } = await supabase
        .from("projects")
        .select(`
          id,
          workspace_id,
          name,
          description,
          created_by,
          created_at,
          profiles:created_by(email, full_name),
          project_members!inner(user_id)
        `)
        .eq("workspace_id", workspaceId)
        .eq("project_members.user_id", activeUserId)
        .order("created_at", { ascending: false });

      if (err2) throw new Error(err2.message);
      
      // Merge and deduplicate
      const allProjects = [...(createdProjects || []), ...(assignedProjects || [])];
      const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());
      
      // Sort again by created_at desc
      uniqueProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      projectsData = uniqueProjects;
    }

    // Fetch user pins for projects
    const pinnedProjectIds = new Map<string, string>(); // projectId -> createdAt
    try {
      const { PinService } = await import("@/features/pins/services/pin.service");
      const userPins = await PinService.getUserPins(activeUserId, "project");
      userPins.forEach(pin => pinnedProjectIds.set(pin.entityId, pin.createdAt));
    } catch (error) {
      console.error("Failed to fetch project pins:", error);
    }

    const mappedProjects = (projectsData || []).map(p => {
      const mapped = mapProject(p);
      if (pinnedProjectIds.has(mapped.id)) {
        mapped.isPinned = true;
        mapped.pinnedAt = pinnedProjectIds.get(mapped.id);
      }
      return mapped;
    });

    // Sort: Pinned first (by pinnedAt desc), then created_at desc
    mappedProjects.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned && a.pinnedAt && b.pinnedAt) {
        return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
      }
      // If we are here, neither is pinned or we fall back
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return mappedProjects;
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

    const userId = await PermissionsService.getCurrentUserId(supabase);
    const isAdmin = await PermissionsService.isWorkspaceAdmin(supabase, userId, workspaceId);

    if (!isAdmin) {
      throw new Error(
        "Unauthorized: Workspace members are not allowed to create projects.",
      );
    }

    // Only include columns that are guaranteed to exist
    const insertData: Record<string, unknown> = {
      workspace_id: workspaceId,
      name,
      created_by: userId,
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
      membersToAssign.add(userId);
      
      if (adminMembers) {
         adminMembers.forEach(m => membersToAssign.add(m.user_id));
      }

      // Fetch the workspace to get the owner_id
      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", workspaceId)
        .maybeSingle();

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
      } else {
        // Refresh messaging statuses for all new members of this project
        try {
          const { MessagingService } = await import("@/features/messages/services/messaging.service");
          for (const uid of Array.from(membersToAssign)) {
            await MessagingService.refreshConversationStatuses(uid);
          }
        } catch (msgErr) {
          console.error("Failed to refresh conversation statuses:", msgErr);
        }
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

    // 1. Authenticate user
    let userId: string;
    try {
      userId = await PermissionsService.getCurrentUserId(supabase);
    } catch {
      return null;
    }

    // 2. Authorize
    const canView = await PermissionsService.canViewProject(supabase, userId, id);
    if (!canView) {
      return null; // Silent deny
    }

    // 3. Fetch data
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
    const userId = await PermissionsService.getCurrentUserId(supabase);
    
    // Check if can manage
    const canManage = await PermissionsService.canManageProject(supabase, userId, id);
    if (!canManage) {
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
    const userId = await PermissionsService.getCurrentUserId(supabase);

    // Fetch project to find its workspace and creator
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("workspace_id, created_by")
      .eq("id", id)
      .maybeSingle();

    if (projErr || !project) {
      throw new Error("Project not found");
    }

    // Check permissions
    const isWorkspaceAdmin = await PermissionsService.isWorkspaceAdmin(supabase, userId, project.workspace_id);
    const isProjectCreator = project.created_by === userId;

    if (!isWorkspaceAdmin && !isProjectCreator) {
      throw new Error(
        "Unauthorized: Only workspace admins or the project creator can delete this project.",
      );
    }

    // Fetch project members before deleting the project
    const memberIds = await ProjectService.getProjectMemberUserIds(id);

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.error("Error deleting project:", error);
      throw new Error(error.message);
    }

    // Refresh messaging conversation statuses for all affected members
    if (memberIds.length > 0) {
      try {
        const { MessagingService } = await import("@/features/messages/services/messaging.service");
        for (const uid of memberIds) {
          await MessagingService.refreshConversationStatuses(uid);
        }
      } catch (msgErr) {
        console.error("Failed to refresh conversation statuses:", msgErr);
      }
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
