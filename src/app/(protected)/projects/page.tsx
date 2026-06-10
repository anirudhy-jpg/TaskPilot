import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/services/workspace.service"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import { MemberService } from "@/services/member.service"
import { ProjectsList } from "@/components/workspace/ProjectsList"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspace")

  const projects = await ProjectService.getProjectsByWorkspace(workspace.id)
  const members = await MemberService.getMembersByWorkspace(workspace.id)

  // Fetch tasks and memberUserIds for each project
  const projectsWithTasks = await Promise.all(
    projects.map(async (project) => {
      const tasks = await TaskService.getTasksByProject(project.id)
      const memberUserIds = await ProjectService.getProjectMemberUserIds(project.id)
      return { ...project, tasks, memberUserIds }
    })
  )

  return (
    <ProjectsList projects={projectsWithTasks} workspaceId={workspace.id} members={members} currentUserId={user.id} />
  )
}
