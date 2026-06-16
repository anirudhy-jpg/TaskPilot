import React from "react"
import { redirect } from "next/navigation"
import { requireUser, createClient } from "@/lib/supabase/server"
import {
  getCachedProfile,
  getCachedWorkspaceForUser,
  getCachedProjectsByWorkspace,
  getCachedMembersByWorkspace,
} from "@/lib/cached-requests"
import { OverviewCharts } from "@/features/workspace/components/overview-charts"
import type { WorkspaceAnalytics } from "@/features/workspace/types/workspace.types"

export const dynamic = "force-dynamic"

export default async function WorkspaceOverviewPage() {
  const { user } = await requireUser()

  // 1. Fetch profile and workspace in parallel (cached)
  const [profile, workspace] = await Promise.all([
    getCachedProfile(user.id).catch(() => null),
    getCachedWorkspaceForUser(user.id),
  ])
  if (!workspace) redirect("/workspaces")

  // 2. Fetch projects, members, notifications in parallel (cached where possible)
  const supabase = await createClient()
  const [projects, members, notificationsRes] = await Promise.all([
    getCachedProjectsByWorkspace(workspace.id, user.id, workspace.currentUserRole),
    getCachedMembersByWorkspace(workspace.id),
    supabase
      .from("notifications")
      .select(`
        id,
        title,
        message,
        type,
        created_at,
        actor_id,
        actor:profiles!notifications_actor_id_fkey(full_name, email, avatar_url)
      `)
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(10)
  ])

  // 3. Batch fetch tasks and columns in parallel using projectIds
  const projectIds = projects.map((p) => p.id)
  let allTasks: any[] = []
  let allColumns: { id: string; board_id: string; name: string }[] = []

  if (projectIds.length > 0) {
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

  // Calculate statistics for members
  const membersWithStats = members.map((member) => {
    const memberTasks = allTasks.filter((t) => t.assigneeId === member.userId)
    const completedTasksCount = memberTasks.filter((t) => {
      const colName = columnMap.get(t.columnId) || t.status?.toLowerCase().trim() || ""
      return (
        colName.includes("done") ||
        colName.includes("complete") ||
        colName.includes("finish")
      )
    }).length

    return {
      ...member,
      totalTasksCount: memberTasks.length,
      completedTasksCount,
    }
  })

  // Serialize notifications cleanly
  const serializedNotifications = (notificationsRes.data || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    createdAt: n.created_at,
    actor: n.actor ? {
      fullName: n.actor.full_name,
      email: n.actor.email,
      avatarUrl: n.actor.avatar_url,
    } : null
  }))

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden h-full">
      {/* Welcome Banner (Fixed at the top) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight sm:text-2xl flex items-center gap-2">
            Welcome back, {profile?.fullName || user.email?.split("@")[0] || "Pilot"}!
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Here&apos;s a live overview of your workspace activity and project progress.
          </p>
        </div>
      </div>

      {/* Charts & Panels (Scrollable area) */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin pb-4">
        <OverviewCharts
          analytics={analytics}
          notifications={serializedNotifications}
          members={membersWithStats}
          workspaceName={workspace.name}
        />
      </div>
    </div>
  )
}
