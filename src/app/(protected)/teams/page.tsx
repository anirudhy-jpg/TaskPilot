import React from "react"
import { redirect } from "next/navigation"
import { requireUser, createClient } from "@/lib/supabase/server"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { ProjectService } from "@/features/project/services/project.service"
import { MemberService } from "@/features/workspace/services/member.service"
import { TeamsList } from "@/features/workspace/components/teams-list"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"

export default async function TeamsPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  // 1. Fetch projects and all workspace members in parallel
  const [projects, allMembers] = await Promise.all([
    ProjectService.getProjectsByWorkspace(workspace.id, user.id),
    MemberService.getMembersByWorkspace(workspace.id),
  ])

  // 2. Fetch all tasks assignees for these projects in a single query
  const membersByProject: Record<string, WorkspaceMember[]> = {}
  projects.forEach((p) => {
    membersByProject[p.id] = []
  })

  if (projects.length > 0) {
    try {
      const projectIds = projects.map((p) => p.id)
      const supabase = await createClient()
      const { data: tasks } = await supabase
        .from("tasks")
        .select("project_id, assigned_to")
        .in("project_id", projectIds)
        .not("assigned_to", "is", null)

      // Map assignee userIds to projects
      const assigneesByProject = new Map<string, Set<string>>()
      ;(tasks || []).forEach((t: any) => {
        const set = assigneesByProject.get(t.project_id) || new Set<string>()
        if (t.assigned_to) {
          set.add(t.assigned_to)
        }
        assigneesByProject.set(t.project_id, set)
      })

      // Map unique assignees to workspace member profiles in memory
      projects.forEach((p) => {
        const userIds = assigneesByProject.get(p.id) || new Set<string>()
        if (userIds.size > 0) {
          membersByProject[p.id] = allMembers.filter(
            (m) => userIds.has(m.userId) && m.role !== "owner"
          )
        }
      })
    } catch (err) {
      console.error("Error batch fetching project members in TeamsPage:", err)
    }
  }

  return (
    <TeamsList projects={projects} membersByProject={membersByProject} />
  )
}
