import React from "react"
import { redirect } from "next/navigation"
import { requireUser, createClient } from "@/lib/supabase/server"
import {
  getCachedWorkspaceForUser,
  getCachedProjectsByWorkspace,
  getCachedMembersByWorkspace,
} from "@/lib/cached-requests"
import { ProjectsList } from "@/features/project/components/projects-list"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const { user } = await requireUser()

  const workspace = await getCachedWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  // Parallelize initial projects and workspace members fetch
  const [projects, members] = await Promise.all([
    getCachedProjectsByWorkspace(workspace.id, user.id, workspace.currentUserRole),
    getCachedMembersByWorkspace(workspace.id),
  ])

  // Batch query tasks, columns, and project member IDs to eliminate N+1 queries
  let projectsWithTasks: (Project & { tasks: Record<string, unknown>[], columns: Record<string, unknown>[], memberUserIds: string[] })[] = []
  if (projects.length > 0) {
    try {
      const projectIds = projects.map((p) => p.id)
      const supabase = await createClient()

      const [tasksRes, colsRes, membersRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(`
            id, project_id, title, description, status, column_id, priority, position, assigned_to, created_at,
            assignee:profiles!tasks_assigned_to_fkey(email, full_name, avatar_url),
            subtasks:task_subtasks(id, completed, status)
          `)
          .in("project_id", projectIds)
          .order("position", { ascending: true }),
        supabase
          .from("columns")
          .select("id, board_id, name, position, created_at")
          .in("board_id", projectIds)
          .order("position", { ascending: true }),
        supabase
          .from("project_members")
          .select("project_id, user_id")
          .in("project_id", projectIds),
      ])

      const tasksByProj = new Map<string, Record<string, unknown>[]>()
      const colsByProj = new Map<string, Record<string, unknown>[]>()
      const membersByProj = new Map<string, string[]>()

      const { mapTask } = await import("@/features/tasks/services/task.service")

      ;(tasksRes.data || []).forEach((row: Record<string, unknown>) => {
        const list = tasksByProj.get(row.project_id as string) || []
        list.push(mapTask(row, row.assignee as Record<string, unknown>))
        tasksByProj.set(row.project_id as string, list)
      })

      ;(colsRes.data || []).forEach((row: Record<string, unknown>) => {
        const list = colsByProj.get(row.board_id as string) || []
        list.push({
          id: row.id,
          boardId: row.board_id,
          name: row.name,
          position: row.position,
          createdAt: row.created_at,
        })
        colsByProj.set(row.board_id as string, list)
      })

      ;(membersRes.data || []).forEach((row: Record<string, unknown>) => {
        const list = membersByProj.get(row.project_id as string) || []
        list.push(row.user_id)
        membersByProj.set(row.project_id, list)
      })

      projectsWithTasks = projects.map((project) => {
        const dbColumns = colsByProj.get(project.id) || []
        // Seed default columns in memory if not present yet
        const columns = dbColumns.length > 0 ? dbColumns : [
          { id: "todo", boardId: project.id, name: "To Do", position: 1000.0, createdAt: new Date().toISOString() },
          { id: "in_progress", boardId: project.id, name: "In Progress", position: 2000.0, createdAt: new Date().toISOString() },
          { id: "done", boardId: project.id, name: "Done", position: 3000.0, createdAt: new Date().toISOString() }
        ]

        return {
          ...project,
          tasks: tasksByProj.get(project.id) || [],
          columns,
          memberUserIds: membersByProj.get(project.id) || [],
        }
      })
    } catch (err) {
      console.error("Error batch fetching projects data:", err)
      projectsWithTasks = projects.map((p) => ({ ...p, tasks: [], columns: [], memberUserIds: [] }))
    }
  }

  return (
    <ProjectsList
      projects={projectsWithTasks}
      workspaceId={workspace.id}
      members={members}
      currentUserId={user.id}
    />
  )
}

