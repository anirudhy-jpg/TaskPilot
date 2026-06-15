import React from "react"
import { redirect } from "next/navigation"
import { requireUser, createClient } from "@/lib/supabase/server"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { ProjectService } from "@/features/project/services/project.service"
import { ProfileService } from "@/features/auth/services/profile.service"
import { OverviewCharts } from "@/features/workspace/components/overview-charts"
import type { WorkspaceAnalytics } from "@/features/workspace/types/workspace.types"

export const dynamic = "force-dynamic"

export default async function WorkspaceOverviewPage() {
  const { user } = await requireUser()

  // 1. Fetch profile and workspace in parallel
  const [profile, workspace] = await Promise.all([
    ProfileService.getProfile(user.id).catch(() => null),
    WorkspaceService.getWorkspaceForUser(user.id),
  ])
  if (!workspace) redirect("/workspaces")

  // 2. Fetch projects (using user.id for optimized permission filtering)
  const projects = await ProjectService.getProjectsByWorkspace(workspace.id, user.id)

  // 3. Batch fetch tasks and columns in parallel using projectIds
  const projectIds = projects.map((p) => p.id)
  let allTasks: any[] = []
  let allColumns: { id: string; board_id: string; name: string }[] = []

  if (projectIds.length > 0) {
    const supabase = await createClient()
    const [tasksRes, colsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, project_id, title, description, status, column_id, priority, position, assigned_to, created_at")
        .in("project_id", projectIds)
        .order("position", { ascending: true }),
      supabase
        .from("columns")
        .select("id, board_id, name")
        .in("board_id", projectIds)
    ])

    const { mapTask } = await import("@/features/tasks/services/task.service")
    if (tasksRes.data) {
      allTasks = tasksRes.data.map((row) => mapTask(row, null))
    }
    if (colsRes.data) {
      allColumns = colsRes.data
    }
  }

  // Map columnId to lowercased name
  const columnMap = new Map<string, string>()
  allColumns.forEach((col) => {
    columnMap.set(col.id, col.name.toLowerCase().trim())
  })

  // Build analytics data
  let todoCount = 0
  let inProgressCount = 0
  let doneCount = 0

  allTasks.forEach((t) => {
    const colName = columnMap.get(t.columnId) || t.status?.toLowerCase().trim() || ""
    if (colName.includes("progress") || colName.includes("doing") || colName === "in_progress") {
      inProgressCount++
    } else if (
      colName.includes("done") ||
      colName.includes("complete") ||
      colName.includes("finish")
    ) {
      doneCount++
    } else {
      todoCount++
    }
  })

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
      const completedTasksCount = projectTasks.filter((t) => {
        const colName = columnMap.get(t.columnId) || t.status?.toLowerCase().trim() || ""
        return (
          colName.includes("done") ||
          colName.includes("complete") ||
          colName.includes("finish")
        )
      }).length

      return {
        name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
        total: projectTasks.length,
        completed: completedTasksCount,
      }
    }),
  }

  return (
    <>
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/10 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl flex items-center gap-2">
            Welcome back, {profile?.fullName || user.email?.split("@")[0] || "Pilot"}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here&apos;s a live overview of your workspace activity and project progress.
          </p>
        </div>
      </div>

      {/* Charts */}
      <OverviewCharts analytics={analytics} />
    </>
  )
}
