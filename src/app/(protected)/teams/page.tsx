import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { ProjectService } from "@/features/project/services/project.service"
import { MemberService } from "@/features/workspace/services/member.service"
import { TeamsList } from "@/features/workspace/components/teams-list"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"

export default async function TeamsPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  const projects = await ProjectService.getProjectsByWorkspace(workspace.id)

  // Fetch members assigned to tasks for each project
  const membersByProject: Record<string, WorkspaceMember[]> = {}
  await Promise.all(
    projects.map(async (project) => {
      membersByProject[project.id] =
        await MemberService.getMembersByProject(project.id)
    })
  )

  return (
    <TeamsList projects={projects} membersByProject={membersByProject} />
  )
}
