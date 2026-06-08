import React from "react"
import { requireUser } from "@/lib/supabase/server"
import { ProfileService } from "@/services/profile.service"
import { WorkspaceService } from "@/services/workspace.service"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import { Sidebar } from "@/components/workspace/Sidebar"
import { Header } from "@/components/workspace/Header"

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

  // Fetch projects and tasks for the sidebar
  let projectsWithTasks: any[] = []
  if (workspace) {
    try {
      const projects = await ProjectService.getProjectsByWorkspace(workspace.id)
      projectsWithTasks = await Promise.all(
        projects.map(async (project) => {
          const tasks = await TaskService.getTasksByProject(project.id)
          return { ...project, tasks }
        })
      )
    } catch (err) {
      console.error("Error fetching projects for sidebar layout:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffdf9] via-[#fbfaf8] to-[#f6f5f0] dark:from-[#0f0e0c] dark:via-[#131211] dark:to-[#181613] text-slate-900 dark:text-slate-100 flex flex-col font-sans w-full relative overflow-hidden">
      {/* Ambient glows (High-vibrancy gold, smoky dark, and warm rose-red highlights) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[55%] rounded-full bg-amber-400/20 dark:bg-amber-500/12 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[45%] rounded-full bg-rose-500/15 dark:bg-rose-600/8 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[40%] h-[40%] rounded-full bg-amber-500/15 dark:bg-amber-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] rounded-full bg-slate-400/12 dark:bg-slate-800/10 blur-[110px] pointer-events-none" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <Header profile={profile} user={user} />

      {/* ── Main Area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden w-full relative z-10">
        <Sidebar workspaceName={workspaceName} projects={projectsWithTasks} />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-transparent flex flex-col gap-6 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
