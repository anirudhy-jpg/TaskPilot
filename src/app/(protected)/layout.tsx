import React from "react"
import { requireUser } from "@/lib/supabase/server"
import { ProfileService } from "@/services/profile.service"
import { WorkspaceService } from "@/services/workspace.service"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import { Sidebar } from "@/components/workspace/Sidebar"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/actions/auth/auth.actions"
import { LogOut } from "lucide-react"

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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans w-full">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 w-full">
        <div className="w-full px-6 h-14 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-3">
            {/* User chip */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-[#2d4a3e]/10 flex items-center justify-center text-[#2d4a3e] text-xs font-semibold uppercase">
                {profile?.fullName?.[0] ||
                  profile?.email?.[0] ||
                  user.email?.[0] ||
                  "?"}
              </div>
              <span className="text-xs font-semibold text-slate-600 hidden sm:inline-block truncate max-w-[150px]">
                {profile?.fullName || profile?.email || user.email}
              </span>
            </div>

            {/* Logout */}
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
              >
                <LogOut size={18} />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Main Area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden w-full">
        <Sidebar workspaceName={workspaceName} projects={projectsWithTasks} />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#f8fafc] flex flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  )
}
