import { createClient } from "@/lib/supabase/server"
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
        userIds = fallbackTasks.map((t: any) => t.assignee_id).filter(Boolean)
      } else {
        console.error("Error fetching task assignees:", taskErr, fallbackErr)
        return []
      }
    } else if (tasks) {
      userIds = tasks.map((t: any) => t.assigned_to).filter(Boolean)
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
      .neq("role", "owner")

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
        .neq("role", "owner")

      if (workspaceId) {
        fallbackQuery = fallbackQuery.eq("workspace_id", workspaceId)
      }

      const { data: fallbackData, error: fallbackErr } = await fallbackQuery

      if (fallbackErr) {
        console.error("Error fetching members by project:", fallbackErr)
        return []
      }

      const members = await fetchProfilesForMembers(supabase, fallbackData || [])
      return members.filter((m) => m.role !== "owner")
    }

    return (data || [])
      .map((row) => mapMember(row, row.profile))
      .filter((m) => m.role !== "owner")
  }

  /**
   * Remove a member from a workspace.
   */
  static async removeMember(workspaceId: string, memberId: string): Promise<void> {
    const supabase = await createClient()

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMember(row: any, profileData: any): WorkspaceMember {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role || "member",
    joinedAt: row.created_at,
    profile: profileData
      ? {
          email: profileData.email,
          fullName: profileData.full_name,
          avatarUrl: profileData.avatar_url,
        }
      : undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchProfilesForMembers(supabase: any, memberRows: any[]): Promise<WorkspaceMember[]> {
  if (memberRows.length === 0) return []

  const userIds = memberRows.map((r) => r.user_id)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", userIds)

  if (error) {
    console.error("Error fetching fallback profiles:", error)
    return memberRows.map((row) => mapMember(row, null))
  }

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
  return memberRows.map((row) => mapMember(row, profileMap.get(row.user_id)))
}
