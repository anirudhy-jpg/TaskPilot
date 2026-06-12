import { useState, useEffect, useTransition, useOptimistic } from "react"
import { useParams, useRouter } from "next/navigation"
import { useBoardRealtime } from "./use-board-realtime"
import type { Project, Task, Column, TaskStatus, TaskPriority } from "../types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"
import { createProjectAction } from "../actions/create-project.action"
import { createTaskAction } from "../actions/create-task.action"
import { updateTaskAssigneeAction } from "../actions/update-task-assignee.action"
import { deleteTaskAction } from "../actions/delete-task.action"
import { deleteProjectAction } from "../actions/delete-project.action"
import { addProjectMemberAction } from "../actions/add-project-member.action"
import { removeProjectMemberAction } from "../actions/remove-project-member.action"
import { moveTaskAction } from "../actions/move-task.action"

export interface UseProjectBoardProps {
  projects: (Project & { tasks: Task[]; columns: Column[] })[]
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
        | { type: "update_task_assignee"; taskId: string; assigneeId: string | null }
        | { type: "delete_task"; taskId: string }
        | { type: "delete_project"; projectId: string }
        | { type: "add_project_member"; projectId: string; userId: string }
        | { type: "remove_project_member"; projectId: string; userId: string }
        | { type: "create_project"; project: Project & { tasks: Task[]; columns: Column[] } }
        | { type: "create_task"; projectId: string; task: Task }
        | { type: "move_task"; taskId: string; columnId: string; position: number }
        | { type: "create_column"; projectId: string; column: Column }
        | { type: "rename_column"; columnId: string; name: string }
        | { type: "move_column"; columnId: string; position: number }
        | { type: "delete_column"; columnId: string; action: "move" | "delete"; targetColumnId?: string }
        | { type: "update_project"; projectId: string; name: string; description?: string }
    ) => {
      switch (action.type) {
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
        case "update_project":
          return state.map((p) =>
            p.id === action.projectId
              ? { ...p, name: action.name, description: action.description || null }
              : p
          )
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
          return state.map((p) => {
            if (p.id !== action.projectId) return p;
            const taskExists = p.tasks.some(
              (t) => t.id === action.task.id || t.title.toLowerCase() === action.task.title.toLowerCase()
            );
            if (taskExists) return p;
            return { ...p, tasks: [...p.tasks, action.task] };
          });
        case "move_task":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === action.taskId
                ? { ...t, columnId: action.columnId, status: action.columnId, position: action.position }
                : t
            ),
          }));
        case "create_column":
          return state.map((p) => {
            if (p.id !== action.projectId) return p;
            const columnExists = (p.columns || []).some(
              (c) => c.id === action.column.id || c.name.toLowerCase() === action.column.name.toLowerCase()
            );
            if (columnExists) return p;
            return { ...p, columns: [...(p.columns || []), action.column] };
          });
        case "rename_column":
          return state.map((p) => ({
            ...p,
            columns: (p.columns || []).map((c) =>
              c.id === action.columnId ? { ...c, name: action.name } : c
            ),
          }))
        case "move_column":
          return state.map((p) => ({
            ...p,
            columns: (p.columns || []).map((c) =>
              c.id === action.columnId ? { ...c, position: action.position } : c
            ),
          }))
        case "delete_column":
          return state.map((p) => {
            const newColumns = (p.columns || []).filter((c) => c.id !== action.columnId)
            let newTasks = p.tasks
            if (action.action === "delete") {
              newTasks = p.tasks.filter((t) => t.columnId !== action.columnId)
            } else if (action.action === "move" && action.targetColumnId) {
              newTasks = p.tasks.map((t) =>
                t.columnId === action.columnId
                  ? { ...t, columnId: action.targetColumnId!, status: action.targetColumnId! }
                  : t
              )
            }
            return {
              ...p,
              columns: newColumns,
              tasks: newTasks,
            }
          })
        default:
          return state
      }
    }
  )

  // Realtime subscription using the single board realtime reconciler
  useBoardRealtime({
    projectId: activeProjectId,
    members,
    onColumnInsert: (newCol) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            const exists = (p.columns || []).some((c) => c.id === newCol.id)
            if (exists) return p
            return {
              ...p,
              columns: [...(p.columns || []), newCol],
            }
          }
          return p
        })
      )
    },
    onColumnUpdate: (updatedCol) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              columns: (p.columns || []).map((c) => (c.id === updatedCol.id ? updatedCol : c)),
            }
          }
          return p
        })
      )
    },
    onColumnDelete: (deletedColId) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              columns: (p.columns || []).filter((c) => c.id !== deletedColId),
            }
          }
          return p
        })
      )
    },
    onTaskInsert: (newTask) => {
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
    onTaskUpdate: (updatedTask) => {
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
    onTaskDelete: (deletedTaskId) => {
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
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false)
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "project" | "task"
    id: string
    name: string
  } | null>(null)

  const [newTaskStatus, setNewTaskStatus] = useState<string>("todo")

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
        columns: [],
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
      const columnId = status || (targetProject?.columns?.[0]?.id ?? "todo")

      const nextPosition = targetProject
        ? (targetProject.tasks.filter((t) => t.columnId === columnId).reduce((max, t) => Math.max(max, t.position), 0) + 1000.0)
        : 1000.0

      const tempTask = {
        id: "temp-" + Date.now(),
        projectId: createTaskProjectId,
        title,
        description: description || null,
        status: columnId,
        columnId,
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
        columnId: tempTask.columnId,
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

  const handleAssigneeChange = (taskId: string, assigneeId: string | null) => {
    if (taskId.startsWith("temp-")) return
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

  const handleMoveTask = (taskId: string, columnId: string, position: number) => {
    if (taskId.startsWith("temp-")) return
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: "move_task", taskId, columnId, position })
      const res = await moveTaskAction(taskId, columnId, position)
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to move task.")
      }
    })
  }

  const handleCreateColumn = (name: string) => {
    if (!activeProjectId) return
    setErrorMsg(null)
    const activeProj = currentProjects.find((p) => p.id === activeProjectId)
    if (activeProj && (activeProj.columns || []).length >= 5) {
      setErrorMsg("A project cannot have more than 5 columns.")
      return
    }
    startTransition(async () => {
      const nextPos = activeProj
        ? (activeProj.columns || []).reduce((max, c) => Math.max(max, c.position), 0) + 1000.0
        : 1000.0
      const tempColumn: Column = {
        id: "temp-" + Date.now(),
        boardId: activeProjectId,
        name,
        position: nextPos,
        createdAt: new Date().toISOString(),
      }
      setOptimisticProjects({ type: "create_column", projectId: activeProjectId, column: tempColumn })
      const { createColumnAction } = await import("../actions/create-column.action")
      const res = await createColumnAction(activeProjectId, name)
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to create column.")
      }
    })
  }

  const handleRenameColumn = (columnId: string, name: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: "rename_column", columnId, name })
      const { updateColumnNameAction } = await import("../actions/update-column-name.action")
      const res = await updateColumnNameAction(columnId, name)
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to rename column.")
      }
    })
  }

  const handleMoveColumn = (columnId: string, position: number) => {
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: "move_column", columnId, position })
      const { moveColumnAction } = await import("../actions/move-column.action")
      const res = await moveColumnAction(columnId, position)
      if (res.success) {
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to move column.")
      }
    })
  }

  const handleDeleteColumn = (columnId: string, action: "move" | "delete", targetColumnId?: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: "delete_column", columnId, action, targetColumnId })
      const { deleteColumnAction } = await import("../actions/delete-column.action")
      const res = await deleteColumnAction(columnId, action, targetColumnId)
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) => {
            if (p.id === activeProjectId) {
              const newColumns = (p.columns || []).filter((c) => c.id !== columnId)
              let newTasks = p.tasks
              if (action === "delete") {
                newTasks = p.tasks.filter((t) => t.columnId !== columnId)
              } else if (action === "move" && targetColumnId) {
                newTasks = p.tasks.map((t) =>
                  t.columnId === columnId
                    ? { ...t, columnId: targetColumnId, status: targetColumnId }
                    : t
                )
              }
              return {
                ...p,
                columns: newColumns,
                tasks: newTasks,
              }
            }
            return p
          })
        )
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to delete column.")
      }
    })
  }

  const handleUpdateProject = (projectId: string, name: string, description?: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: "update_project", projectId, name, description })
      setProjectToEdit(null)
      const { updateProjectAction } = await import("../actions/update-project.action")
      const res = await updateProjectAction(projectId, name, description)
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, name, description: description || null }
              : p
          )
        )
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to update project.")
      }
    })
  }

  const cycleTaskStatus = (taskId: string, currentStatus: string) => {
    const project = currentProjects.find((p) => p.tasks.some((t) => t.id === taskId))
    if (!project) return
    const cols = [...(project.columns || [])].sort((a, b) => a.position - b.position)
    if (cols.length === 0) return
    const currentIndex = cols.findIndex((c) => c.id === currentStatus)
    const nextIndex = (currentIndex + 1) % cols.length
    const nextColumn = cols[nextIndex]
    const targetTasks = project.tasks.filter((t) => t.columnId === nextColumn.id)
    const nextPosition = (targetTasks[targetTasks.length - 1]?.position ?? 0) + 1000.0
    handleMoveTask(taskId, nextColumn.id, nextPosition)
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
    projectToEdit,
    setProjectToEdit,
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
    handleAssigneeChange,
    handleMoveTask,
    cycleTaskStatus,
    handleCreateColumn,
    handleRenameColumn,
    handleMoveColumn,
    handleDeleteColumn,
    handleUpdateProject,
    handleDeleteConfirmSubmit,
  }
}
