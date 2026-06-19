import { createClient } from "@/lib/supabase/server"
import { type SupabaseClient } from "@supabase/supabase-js"
import type { WorkspaceMember } from "../types/workspace.types"

export class MemberService {
  /**
   * Get all members of a workspace with their profile info.
   */
  static async getMembersByWorkspace(
    workspaceId: string
  ): Promise<WorkspaceMember[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        *,
        profile:profiles(email, full_name, avatar_url)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })

    if (error) {
      // Fallback without join if FK name doesn't match
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })

      if (fallbackErr) {
        console.error("Error fetching members:", fallbackErr)
        throw new Error(fallbackErr.message)
      }

      return fetchProfilesForMembers(supabase, fallbackData || [])
    }

    return (data || []).map((row) => mapMember(row, row.profile))
  }

  /**
   * Get members assigned to tasks in a specific project.
   */
  static async getMembersByProject(
    projectId: string
  ): Promise<WorkspaceMember[]> {
    const supabase = await createClient()

    // Resilient fetching of task assignees (supports both assigned_to and assignee_id)
    let userIds: string[] = []

    const { data: tasks, error: taskErr } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("project_id", projectId)
      .not("assigned_to", "is", null)

    if (taskErr) {
      const { data: fallbackTasks, error: fallbackErr } = await supabase
        .from("tasks")
        .select("assignee_id")
        .eq("project_id", projectId)
        .not("assignee_id", "is", null)

      if (!fallbackErr && fallbackTasks) {
        userIds = fallbackTasks.map((t: { assignee_id?: string }) => t.assignee_id as string).filter(Boolean)
      } else {
        console.error("Error fetching task assignees:", taskErr, fallbackErr)
        return []
      }
    } else if (tasks) {
      userIds = tasks.map((t: { assigned_to?: string }) => t.assigned_to as string).filter(Boolean)
    }

    const uniqueUserIds = [...new Set(userIds)]

    if (uniqueUserIds.length === 0) return []

    // Fetch workspace_id of the project to filter and avoid cross-workspace duplicates
    const { data: projectData } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single()

    const workspaceId = projectData?.workspace_id

    let query = supabase
      .from("workspace_members")
      .select(`
        *,
        profile:profiles(email, full_name, avatar_url)
      `)
      .in("user_id", uniqueUserIds)

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId)
    }

    const { data, error } = await query

    if (error) {
      // Fallback without join
      let fallbackQuery = supabase
        .from("workspace_members")
        .select("*")
        .in("user_id", uniqueUserIds)

      if (workspaceId) {
        fallbackQuery = fallbackQuery.eq("workspace_id", workspaceId)
      }

      const { data: fallbackData, error: fallbackErr } = await fallbackQuery

      if (fallbackErr) {
        console.error("Error fetching members by project:", fallbackErr)
        return []
      }

      const members = await fetchProfilesForMembers(supabase, fallbackData || [])
      return members
    }

    return (data || [])
      .map((row) => mapMember(row, row.profile))
  }

  static async removeMember(workspaceId: string, memberId: string, actorId?: string | null): Promise<void> {
    const supabase = await createClient()

    // 1. Get the user_id and profile of the member being removed
    const { data: memberRow } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        profile:profiles(email, full_name)
      `)
      .eq("id", memberId)
      .single()

    let removedMemberName = "A member"
    if (memberRow) {
      const profile: { full_name?: string, email?: string } = Array.isArray(memberRow.profile) ? memberRow.profile[0] as { full_name?: string, email?: string } : memberRow.profile as { full_name?: string, email?: string }
      removedMemberName = profile?.full_name || profile?.email || "A member"
    }

    if (memberRow?.user_id) {
      const userId = memberRow.user_id

      // 2. Fetch projects in this workspace
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", workspaceId)

      if (projects && projects.length > 0) {
        const projectIds = projects.map((p) => p.id)

        // Remove project memberships for projects in this workspace
        await supabase
          .from("project_members")
          .delete()
          .in("project_id", projectIds)
          .eq("user_id", userId)

        // Unassign the user from tasks in this workspace's projects
        await supabase
          .from("tasks")
          .update({ assigned_to: null })
          .in("project_id", projectIds)
          .eq("assigned_to", userId)
      }
    }

    // 3. Create member_removed notifications before we delete the membership
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id, name")
      .eq("id", workspaceId)
      .single()

    if (ws?.owner_id && memberRow?.user_id) {
      const notifications = []

      // Notify the owner
      if (ws.owner_id !== memberRow.user_id) {
        notifications.push({
          user_id: ws.owner_id,
          workspace_id: workspaceId,
          title: "Member Removed",
          message: `${removedMemberName} was removed from the workspace.`,
          type: "member_removed",
          actor_id: actorId || null,
        })
      }

      // Notify the removed member
      notifications.push({
        user_id: memberRow.user_id,
        workspace_id: workspaceId,
        title: "Removed from Workspace",
        message: `You have been removed from the workspace ${ws.name}.`,
        type: "member_removed",
        actor_id: actorId || null,
      })

      const { error: notifErr } = await supabase
        .from("notifications")
        .insert(notifications)

      if (notifErr) {
        console.error("Error creating member_removed notifications:", notifErr)
      }
    }

    // 4. Delete from workspace_members
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", memberId)

    if (error) {
      console.error("Error removing member:", error)
      throw new Error(error.message)
    }
  }

}

// ─── Helpers ─────────────────────────────────────────────────
type MemberRow = {
  id?: string;
  workspace_id?: string;
  user_id?: string;
  role?: string;
  created_at?: string;
};

type ProfileRow = {
  id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
};

function mapMember(row: MemberRow, profileData: ProfileRow | null | undefined): WorkspaceMember {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    userId: row.user_id as string,
    role: (row.role as "owner" | "admin" | "member") || "member",
    joinedAt: row.created_at as string,
    profile: profileData
      ? {
          email: profileData.email as string,
          fullName: profileData.full_name as string,
          avatarUrl: profileData.avatar_url as string | null,
        }
      : undefined,
  }
}

async function fetchProfilesForMembers(supabase: SupabaseClient, memberRows: MemberRow[]): Promise<WorkspaceMember[]> {
  if (memberRows.length === 0) return []

  const userIds = memberRows.map((r) => r.user_id as string)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", userIds)

  if (error) {
    console.error("Error fetching fallback profiles:", error)
    return memberRows.map((row) => mapMember(row, null))
  }

  const profileMap = new Map((profiles || []).map((p: ProfileRow) => [p.id, p]))
  return memberRows.map((row) => mapMember(row, profileMap.get(row.user_id as string)))
}
