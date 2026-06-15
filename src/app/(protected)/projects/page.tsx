import React from "react"
import { redirect } from "next/navigation"
import { requireUser, createClient } from "@/lib/supabase/server"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { ProjectService } from "@/features/project/services/project.service"
import { MemberService } from "@/features/workspace/services/member.service"
import { ProjectsList } from "@/features/project/components/projects-list"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  // Parallelize initial projects and workspace members fetch
  const [projects, members] = await Promise.all([
    ProjectService.getProjectsByWorkspace(workspace.id, user.id),
    MemberService.getMembersByWorkspace(workspace.id),
  ])

  // Batch query tasks, columns, and project member IDs to eliminate N+1 queries
  let projectsWithTasks: any[] = []
  if (projects.length > 0) {
    try {
      const projectIds = projects.map((p) => p.id)
      const supabase = await createClient()

      const [tasksRes, colsRes, membersRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(`
            id, project_id, title, description, status, column_id, priority, position, assigned_to, created_at,
            assignee:profiles!tasks_assigned_to_fkey(email, full_name, avatar_url)
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

      const tasksByProj = new Map<string, any[]>()
      const colsByProj = new Map<string, any[]>()
      const membersByProj = new Map<string, string[]>()

      const { mapTask } = await import("@/features/tasks/services/task.service")

      ;(tasksRes.data || []).forEach((row: any) => {
        const list = tasksByProj.get(row.project_id) || []
        list.push(mapTask(row, row.assignee))
        tasksByProj.set(row.project_id, list)
      })

      ;(colsRes.data || []).forEach((row: any) => {
        const list = colsByProj.get(row.board_id) || []
        list.push({
          id: row.id,
          boardId: row.board_id,
          name: row.name,
          position: row.position,
          createdAt: row.created_at,
        })
        colsByProj.set(row.board_id, list)
      })

      ;(membersRes.data || []).forEach((row: any) => {
        const list = membersByProj.get(row.project_id) || []
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

