import React from "react"
import { redirect } from "next/navigation"
import { requireUser, createClient } from "@/lib/supabase/server"
import {
  getCachedWorkspaceForUser,
  getCachedProjectsByWorkspace,
  getCachedMembersByWorkspace,
} from "@/lib/cached-requests"
import { TeamsList } from "@/features/workspace/components/teams-list"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"

export default async function TeamsPage() {
  const { user } = await requireUser()

  const workspace = await getCachedWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  // 1. Fetch projects and all workspace members in parallel
  const [projects, allMembers] = await Promise.all([
    getCachedProjectsByWorkspace(workspace.id, user.id, workspace.currentUserRole),
    getCachedMembersByWorkspace(workspace.id),
  ])

  // 2. Fetch all project_members rows for these projects in a single query
  //    so we show every member added to a project, not just task assignees.
  const membersByProject: Record<string, WorkspaceMember[]> = {}
  projects.forEach((p) => {
    membersByProject[p.id] = []
  })

  if (projects.length > 0) {
    try {
      const projectIds = projects.map((p) => p.id)
      const supabase = await createClient()
      const { data: projectMemberRows } = await supabase
        .from("project_members")
        .select("project_id, user_id")
        .in("project_id", projectIds)

      // Group user_ids by project
      const userIdsByProject = new Map<string, Set<string>>()
      ;(projectMemberRows || []).forEach((row: any) => {
        const set = userIdsByProject.get(row.project_id) || new Set<string>()
        set.add(row.user_id)
        userIdsByProject.set(row.project_id, set)
      })

      // Map each project's user_ids to their full workspace member profiles
      projects.forEach((p) => {
        const userIds = userIdsByProject.get(p.id) || new Set<string>()
        membersByProject[p.id] = allMembers.filter((m) => userIds.has(m.userId))
      })
    } catch (err) {
      console.error("Error batch fetching project members in TeamsPage:", err)
    }
  }

  return (
    <TeamsList projects={projects} membersByProject={membersByProject} />
  )
}
