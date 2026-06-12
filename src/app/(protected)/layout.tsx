import React from "react"
import { requireUser } from "@/lib/supabase/server"
import { ProfileService } from "@/features/auth/services/profile.service"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { ProjectService } from "@/features/project/services/project.service"
import { TaskService } from "@/features/project/services/task.service"
import { WorkspaceHubService } from "@/features/workspace/services/workspace-hub.service"
import { WorkspaceShell } from "@/features/workspace/components/workspace-shell"

import { ColumnService } from "@/features/project/services/column.service"

export const dynamic = "force-dynamic"


export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireUser()

  // Fetch profile
  let profile = null
  try {
    profile = await ProfileService.getProfile(user.id)
    if (!profile && user.email) {
      profile = await ProfileService.createProfile(
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name || undefined
      )
    }
  } catch (err) {
    console.error("Error loading profile:", err)
  }

  // Fetch or create workspace
  let workspace = null
  try {
    workspace = await WorkspaceService.getWorkspaceForUser(user.id)
    if (!workspace) {
      // Auto-create a default workspace for the user
      workspace = await WorkspaceService.createWorkspace(
        `${profile?.fullName || user.email?.split("@")[0] || "My"}'s Workspace`,
        user.id
      )
    }
  } catch (err) {
    console.error("Error loading workspace:", err)
  }

  const workspaceName = workspace?.name || "Workspace"

  // Fetch owner email if workspace exists
  let ownerEmail = ""
  if (workspace) {
    try {
      const ownerProfile = await ProfileService.getProfile(workspace.ownerId)
      if (ownerProfile) {
        ownerEmail = ownerProfile.email
      }
    } catch (err) {
      console.error("Error fetching workspace owner profile for layout:", err)
    }
  }

  // Fetch projects and tasks for the sidebar
  let projectsWithTasks: any[] = []
  if (workspace) {
    try {
      const projects = await ProjectService.getProjectsByWorkspace(workspace.id)
      projectsWithTasks = await Promise.all(
        projects.map(async (project) => {
          const tasks = await TaskService.getTasksByProject(project.id)
          const columns = await ColumnService.getColumnsByProject(project.id)
          return { ...project, tasks, columns }
        })
      )
    } catch (err) {
      console.error("Error fetching projects for sidebar layout:", err)
    }
  }

  // Fetch workspaces for switcher
  let workspaces: any[] = []
  try {
    workspaces = await WorkspaceHubService.getWorkspacesForUser(user.id)
  } catch (err) {
    console.error("Error loading workspaces for layout switcher:", err)
  }

  return (
    <WorkspaceShell
      profile={profile}
      user={user}
      isWorkspaceOwner={workspace ? workspace.ownerId === user.id : true}
      workspaceId={workspace?.id || null}
      workspaceName={workspaceName}
      workspaces={workspaces}
      currentUserId={user.id}
      projectsWithTasks={projectsWithTasks}
      ownerEmail={ownerEmail}
    >
      {children}
    </WorkspaceShell>
  )
}
