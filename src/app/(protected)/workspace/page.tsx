import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/services/workspace.service"
import { ProjectService } from "@/services/project.service"
import { TaskService } from "@/services/task.service"
import { ProfileService } from "@/services/profile.service"
import { OverviewCharts } from "@/components/workspace/OverviewCharts"
import type { WorkspaceAnalytics } from "@/types/workspace.types"

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
  if (!workspace) redirect("/workspace")

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
      { name: "To Do", value: todoCount, color: "#94a3b8" },
      { name: "In Progress", value: inProgressCount, color: "#f59e0b" },
      { name: "Done", value: doneCount, color: "#2d4a3e" },
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
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          Welcome back, {profile?.fullName || user.email || "Pilot"}!
        </h1>
        <p className="text-sm text-slate-500">
          Here&apos;s an overview of your workspace activity and project
          progress.
        </p>
      </div>

      {/* Charts */}
      <OverviewCharts analytics={analytics} />
    </>
  )
}
