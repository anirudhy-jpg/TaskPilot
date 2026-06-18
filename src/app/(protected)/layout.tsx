import React from "react"
import { requireUser, createClient } from "@/lib/supabase/server"
import {
  getCachedProfile,
  getCachedWorkspaceForUser,
  getCachedProjectsByWorkspace
} from "@/lib/cached-requests"
import { WorkspaceHubService } from "@/features/workspace/services/workspace-hub.service"
import { WorkspaceShell } from "@/features/workspace/components/workspace-shell"
import type { Project, Task } from "@/features/project/types/project.types"
import type { Workspace } from "@/features/workspace/types/workspace.types"

export const dynamic = "force-dynamic"

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireUser()

  // 1. Fetch profile and workspace in parallel (cached).
  //    Onboarding (profile/workspace/membership creation) is handled in
  //    /callback/route.ts before any redirect into this layout, so by the
  //    time we reach here the DB should already be consistent.
  let profile = null
  let workspace = null
  try {
    const [pRes, wsRes] = await Promise.all([
      getCachedProfile(user.id).catch(() => null),
      getCachedWorkspaceForUser(user.id).catch(() => null),
    ])
    profile = pRes
    workspace = wsRes
  } catch (err) {
    console.error("Error loading profile and workspace:", err)
  }

  const workspaceName = workspace?.name || "Workspace"

  // 2. Parallel fetch Owner profile, Projects, Workspaces list (cached)
  let ownerEmail = ""
  let projects: Project[] = []
  let workspaces: Workspace[] = []

  if (workspace) {
    try {
      const [ownerProfile, projRes, wsListRes] = await Promise.all([
        getCachedProfile(workspace.ownerId).catch(() => null),
        getCachedProjectsByWorkspace(workspace.id, user.id, workspace.currentUserRole).catch(() => []),
        WorkspaceHubService.getWorkspacesForUser(user.id).catch(() => []),
      ])

      if (ownerProfile) ownerEmail = ownerProfile.email
      projects = projRes
      workspaces = wsListRes
    } catch (err) {
      console.error("Error parallel fetching workspace layout details:", err)
    }
  }

  // 3. Batch fetch tasks for all projects to avoid N+1 sidebar lookups
  let projectsWithTasks: (Project & { tasks: Task[] })[] = []
  if (workspace && projects.length > 0) {
    try {
      const projectIds = projects.map((p) => p.id)
      const supabase = await createClient()

      // Fetch all tasks for these projects in one query
      const { data: allTasks, error: tasksErr } = await supabase
        .from("tasks")
        .select("id, project_id, title, column_id")
        .in("project_id", projectIds)
        .order("position", { ascending: true })

      if (tasksErr) throw new Error(tasksErr.message)

      // Map tasks to their corresponding projects
      const tasksByProject = new Map<string, Task[]>()
      ;(allTasks || []).forEach((t) => {
        const list = tasksByProject.get(t.project_id) || []
        list.push({
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          description: null,
          columnId: t.column_id || "",
          priority: "medium" as const,
          position: 0,
          assigneeId: null,
          createdAt: "",
        })
        tasksByProject.set(t.project_id, list)
      })

      projectsWithTasks = projects.map((project) => ({
        ...project,
        tasks: tasksByProject.get(project.id) || [],
        columns: [], // columns is unused in the sidebar layout
      }))
    } catch (err) {
      console.error("Error batch fetching tasks for sidebar layout:", err)
      projectsWithTasks = projects.map((p) => ({ ...p, tasks: [], columns: [] }))
    }
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
