import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { ProjectService } from "@/features/project/services/project.service"
import { TaskService } from "@/features/project/services/task.service"
import { MemberService } from "@/features/workspace/services/member.service"
import { ProjectsList } from "@/features/project/components/projects-list"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

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
