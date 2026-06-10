import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/services/workspace.service"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import { ProfileService } from "@/services/profile.service"
import { OverviewCharts } from "@/components/workspace/OverviewCharts"
import type { WorkspaceAnalytics } from "@/types/workspace.types"

export const dynamic = "force-dynamic"

export default async function WorkspaceOverviewPage() {
  const { user } = await requireUser()

  // Ensure profile exists
  let profile = null
  try {
    profile = await ProfileService.getProfile(user.id)
  } catch {
    // ignore
  }

  // Get workspace
  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  // Get projects and tasks for analytics
  const projects = await ProjectService.getProjectsByWorkspace(workspace.id)
  const allTasks = await TaskService.getTasksByWorkspace(workspace.id)

  // Build analytics data
  const todoCount = allTasks.filter((t) => t.status === "todo").length
  const inProgressCount = allTasks.filter(
    (t) => t.status === "in_progress"
  ).length
  const doneCount = allTasks.filter((t) => t.status === "done").length

  const analytics: WorkspaceAnalytics = {
    totalProjects: projects.length,
    totalTasks: allTasks.length,
    tasksByStatus: [
      { name: "To Do", value: todoCount, color: "#cbd5e1" },
      { name: "In Progress", value: inProgressCount, color: "#f59e0b" },
      { name: "Done", value: doneCount, color: "#f43f5e" },
    ],
    projectTaskCounts: projects.map((p) => {
      const projectTasks = allTasks.filter((t) => t.projectId === p.id)
      return {
        name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
        total: projectTasks.length,
        completed: projectTasks.filter((t) => t.status === "done").length,
      }
    }),
  }

  return (
    <>
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-amber-900/5 border-l-4 border-l-amber-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <h1 className="text-lg font-extrabold text-slate-800 mb-1 tracking-tight flex items-center gap-2">
          <span>⚡</span> Welcome back, {profile?.fullName || user.email?.split("@")[0] || "Pilot"}!
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Here&apos;s a live overview of your workspace activity and project progress.
        </p>
      </div>

      {/* Charts */}
      <OverviewCharts analytics={analytics} />
    </>
  )
}
