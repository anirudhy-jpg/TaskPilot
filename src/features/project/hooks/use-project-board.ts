import { useState, useEffect, useTransition, useOptimistic } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTasksRealtime } from "./use-tasks-realtime"
import type { Project, Task, TaskStatus, TaskPriority } from "../types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"
import { createProjectAction } from "../actions/create-project.action"
import { createTaskAction } from "../actions/create-task.action"
import { updateTaskStatusAction } from "../actions/update-task-status.action"
import { updateTaskAssigneeAction } from "../actions/update-task-assignee.action"
import { deleteTaskAction } from "../actions/delete-task.action"
import { deleteProjectAction } from "../actions/delete-project.action"
import { addProjectMemberAction } from "../actions/add-project-member.action"
import { removeProjectMemberAction } from "../actions/remove-project-member.action"
import { batchUpdateTaskPositionsAction } from "../actions/batch-update-task-positions.action"


export interface UseProjectBoardProps {
  projects: (Project & { tasks: Task[] })[]
  workspaceId: string
  members: WorkspaceMember[]
  currentUserId?: string
}

export function useProjectBoard({
  projects,
  workspaceId,
  members,
  currentUserId,
}: UseProjectBoardProps) {
  const router = useRouter()
  const params = useParams()
  const activeProjectId = (params?.projectId as string) || null

  const [prevProjects, setPrevProjects] = useState(projects)
  const [currentProjects, setCurrentProjects] = useState(projects)

  if (projects !== prevProjects) {
    setPrevProjects(projects)
    setCurrentProjects(projects)
  }

  // React 19 Optimistic state hook for immediate UI feedback on CRUD operations
  const [optimisticProjects, setOptimisticProjects] = useOptimistic(
    currentProjects,
    (
      state,
      action:
        | { type: "update_task_status"; taskId: string; status: TaskStatus }
        | { type: "update_task_assignee"; taskId: string; assigneeId: string | null }
        | { type: "delete_task"; taskId: string }
        | { type: "delete_project"; projectId: string }
        | { type: "add_project_member"; projectId: string; userId: string }
        | { type: "remove_project_member"; projectId: string; userId: string }
        | { type: "create_project"; project: Project & { tasks: Task[] } }
        | { type: "create_task"; projectId: string; task: Task }
        | { type: "reorder_tasks"; projectId: string; updates: { id: string; status: TaskStatus; position: number }[] }
    ) => {
      switch (action.type) {
        case "update_task_status":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === action.taskId ? { ...t, status: action.status } : t
            ),
          }))
        case "update_task_assignee": {
          const member = members.find((m) => m.userId === action.assigneeId)
          const assignee = member
            ? {
                fullName: member.profile?.fullName || null,
                email: member.profile?.email || "",
                avatarUrl: member.profile?.avatarUrl || null,
              }
            : null
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === action.taskId
                ? {
                    ...t,
                    assigneeId: action.assigneeId,
                    assignee: assignee || undefined,
                  }
                : t
            ),
          }))
        }
        case "delete_task":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.filter((t) => t.id !== action.taskId),
          }))
        case "delete_project":
          return state.filter((p) => p.id !== action.projectId)
        case "add_project_member":
          return state.map((p) =>
            p.id === action.projectId
              ? { ...p, memberUserIds: [...(p.memberUserIds || []), action.userId] }
              : p
          )
        case "remove_project_member":
          return state.map((p) =>
            p.id === action.projectId
              ? { ...p, memberUserIds: (p.memberUserIds || []).filter((id) => id !== action.userId) }
              : p
          )
        case "create_project":
          return [...state, action.project]
        case "create_task":
          return state.map((p) =>
            p.id === action.projectId
              ? { ...p, tasks: [...p.tasks, action.task] }
              : p
          )
        case "reorder_tasks": {
          const updateMap = new Map(action.updates.map((u) => [u.id, u]))
          return state.map((p) =>
            p.id === action.projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) => {
                    const update = updateMap.get(t.id)
                    if (update) {
                      return { ...t, status: update.status, position: update.position }
                    }
                    return t
                  }),
                }
              : p
          )
        }
        default:
          return state
      }
    }
  )

  // Realtime subscription using the refactored useTasksRealtime hook
  useTasksRealtime({
    projectId: activeProjectId,
    members,
    onInsert: (newTask) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            const exists = p.tasks.some((t) => t.id === newTask.id)
            if (exists) return p
            return {
              ...p,
              tasks: [...p.tasks, newTask],
            }
          }
          return p
        })
      )
    },
    onUpdate: (updatedTask) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              tasks: p.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
            }
          }
          return p
        })
      )
    },
    onDelete: (deletedTaskId) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              tasks: p.tasks.filter((t) => t.id !== deletedTaskId),
            }
          }
          return p
        })
      )
    },
  })

  const activeProject = optimisticProjects.find((p) => p.id === activeProjectId)

  // Find project members & eligible workspace members
  const workspaceOwner = members.find((m) => m.role === "owner")
  const isWorkspaceOwner = workspaceOwner?.userId === currentUserId

  const currentUserMember = members.find((m) => m.userId === currentUserId)
  const currentUserRole = currentUserMember?.role || (isWorkspaceOwner ? "owner" : "member")
  const isWorkspaceMember = currentUserRole === "member"

  const projectMemberUserIds = activeProject?.memberUserIds || []
  const currentProjectMembers = members.filter((m) => projectMemberUserIds.includes(m.userId))
  const eligibleMembers = members.filter((m) => !projectMemberUserIds.includes(m.userId))

  // Modal State Variables
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false)
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "project" | "task"
    id: string
    name: string
  } | null>(null)

  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo")

  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAddProjectMember = (userId: string): Promise<void> => {
    if (!activeProject) return Promise.resolve()
    setErrorMsg(null)
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        setOptimisticProjects({ type: "add_project_member", projectId: activeProject.id, userId })
        const res = await addProjectMemberAction(activeProject.id, userId)
        if (res.success) {
          router.refresh()
          resolve()
        } else {
          setErrorMsg(res.error || "Failed to add member.")
          reject(new Error(res.error || "Failed to add member."))
        }
      })
    })
  }

  const handleRemoveProjectMember = (userId: string): Promise<void> => {
    if (!activeProject) return Promise.resolve()
    setErrorMsg(null)
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        setOptimisticProjects({ type: "remove_project_member", projectId: activeProject.id, userId })
        const res = await removeProjectMemberAction(activeProject.id, userId)
        if (res.success) {
          router.refresh()
          resolve()
        } else {
          setErrorMsg(res.error || "Failed to remove member.")
          reject(new Error(res.error || "Failed to remove member."))
        }
      })
    })
  }

  const handleCreateProject = (name: string, description?: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      const tempId = "temp-" + Date.now()
      const tempProject = {
        id: tempId,
        workspaceId,
        name,
        description: description || null,
        status: "active" as const,
        createdAt: new Date().toISOString(),
        tasks: [],
        memberUserIds: [currentUserId || ""],
      }
      setOptimisticProjects({ type: "create_project", project: tempProject })
      setIsCreateProjectOpen(false)
      const res = await createProjectAction(workspaceId, name, description)
      if (res.success) {
        if (res.projectId) {
          router.push(`/projects/${res.projectId}`)
        } else {
          router.refresh()
        }
      } else {
        setErrorMsg(res.error || "Failed to create project.")
      }
    })
  }

  const handleCreateTask = (
    title: string,
    description?: string,
    status?: TaskStatus,
    assigneeId?: string,
    priority?: TaskPriority
  ) => {
    if (!createTaskProjectId) return
    setErrorMsg(null)
    startTransition(async () => {
      const selectedAssignee = members.find((m) => m.userId === assigneeId)?.profile || null
      const targetProject = optimisticProjects.find((p) => p.id === createTaskProjectId)
      const nextPosition = targetProject
        ? targetProject.tasks.filter((t) => t.status === (status || "todo")).length
        : 0

      const tempTask = {
        id: "temp-" + Date.now(),
        projectId: createTaskProjectId,
        title,
        description: description || null,
        status: status || "todo",
        priority: priority || "medium",
        position: nextPosition,
        assigneeId: assigneeId || null,
        createdAt: new Date().toISOString(),
        assignee: selectedAssignee
          ? {
              fullName: selectedAssignee.fullName || null,
              email: selectedAssignee.email || "",
              avatarUrl: selectedAssignee.avatarUrl || null,
            }
          : undefined,
      }
      setOptimisticProjects({
        type: "create_task",
        projectId: createTaskProjectId,
        task: tempTask,
      })
      setCreateTaskProjectId(null)

      const res = await createTaskAction({
        projectId: tempTask.projectId,
        title,
        description,
        status: tempTask.status,
        priority: tempTask.priority,
        assigneeId: assigneeId || undefined,
      })
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to create task.")
      }
    })
  }

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: "update_task_status", taskId, status })
      const res = await updateTaskStatusAction(taskId, status)
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to update task status.")
      }
    })
  }

  const handleAssigneeChange = (taskId: string, assigneeId: string | null) => {
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: "update_task_assignee", taskId, assigneeId })
      const res = await updateTaskAssigneeAction(taskId, assigneeId)
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to update task assignee.")
      }
    })
  }

  const cycleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus =
      currentStatus === "todo"
        ? "in_progress"
        : currentStatus === "in_progress"
          ? "done"
          : "todo"
    handleStatusChange(taskId, nextStatus)
  }

  const handleTasksReorder = (
    updates: { id: string; status: TaskStatus; position: number }[],
    _draggedTaskId?: string
  ) => {
    if (!activeProject) return
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({
        type: "reorder_tasks",
        projectId: activeProject.id,
        updates,
      })

      const res = await batchUpdateTaskPositionsAction(updates)
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to save task positions.")
      }
    })
  }

  const handleDeleteConfirmSubmit = () => {
    if (!deleteTarget) return
    setErrorMsg(null)
    const target = deleteTarget
    setDeleteTarget(null)
    startTransition(async () => {
      let res
      if (target.type === "project") {
        setOptimisticProjects({ type: "delete_project", projectId: target.id })
        res = await deleteProjectAction(target.id)
        if (res.success && activeProjectId === target.id) {
          router.push("/projects")
        }
      } else {
        setOptimisticProjects({ type: "delete_task", taskId: target.id })
        res = await deleteTaskAction(target.id)
      }

      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to execute delete action.")
      }
    })
  }

  return {
    activeProjectId,
    activeProject,
    optimisticProjects,
    currentProjectMembers,
    eligibleMembers,
    isWorkspaceOwner,
    isWorkspaceMember,
    isCreateProjectOpen,
    setIsCreateProjectOpen,
    isManageMembersOpen,
    setIsManageMembersOpen,
    createTaskProjectId,
    setCreateTaskProjectId,
    deleteTarget,
    setDeleteTarget,
    newTaskStatus,
    setNewTaskStatus,
    isPending,
    errorMsg,
    setErrorMsg,
    handleAddProjectMember,
    handleRemoveProjectMember,
    handleCreateProject,
    handleCreateTask,
    handleStatusChange,
    handleAssigneeChange,
    cycleTaskStatus,
    handleTasksReorder,
    handleDeleteConfirmSubmit,
  }
}
