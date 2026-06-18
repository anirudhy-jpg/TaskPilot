import { useRouter } from "next/navigation";
import type {
  Project,
  Task,
  Column,
  TaskStatus,
  TaskPriority,
} from "../types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { createProjectAction } from "../actions/create-project.action";
import { createTaskAction } from "@/features/tasks/actions/create-task.action";
import { updateTaskAssigneeAction } from "@/features/tasks/actions/update-task-assignee.action";
import { deleteTaskAction } from "@/features/tasks/actions/delete-task.action";
import { deleteProjectAction } from "../actions/delete-project.action";
import { addProjectMemberAction } from "../actions/add-project-member.action";
import { removeProjectMemberAction } from "../actions/remove-project-member.action";
import { moveTaskAction } from "@/features/tasks/actions/move-task.action";
import { updateTaskAction } from "@/features/tasks/actions/update-task.action";
import type { OptimisticAction } from "./use-project-board-state";

export interface UseProjectBoardOperationsProps {
  workspaceId: string;
  currentUserId?: string;
  activeProjectId: string | null;
  activeProject?: Project & { tasks: Task[]; columns: Column[] };
  members: WorkspaceMember[];

  // State
  currentProjects: (Project & { tasks: Task[]; columns: Column[] })[];
  setCurrentProjects: React.Dispatch<
    React.SetStateAction<(Project & { tasks: Task[]; columns: Column[] })[]>
  >;
  optimisticProjects: (Project & { tasks: Task[]; columns: Column[] })[];
  setOptimisticProjects: (action: OptimisticAction) => void;

  // Modals state setters
  setIsCreateProjectOpen: (open: boolean) => void;
  setProjectToEdit: (project: Project | null) => void;
  setCreateTaskProjectId: (id: string | null) => void;
  createTaskProjectId: string | null;
  deleteTarget: { type: "project" | "task"; id: string; name: string } | null;
  setDeleteTarget: (
    target: { type: "project" | "task"; id: string; name: string } | null,
  ) => void;
  setErrorMsg: (msg: string | null) => void;

  // Transitions
  startTransition: React.TransitionStartFunction;
}

export function useProjectBoardOperations({
  workspaceId,
  currentUserId,
  activeProjectId,
  activeProject,
  members,
  currentProjects,
  setCurrentProjects,
  optimisticProjects,
  setOptimisticProjects,
  setIsCreateProjectOpen,
  setProjectToEdit,
  setCreateTaskProjectId,
  createTaskProjectId,
  deleteTarget,
  setDeleteTarget,
  setErrorMsg,
  startTransition,
}: UseProjectBoardOperationsProps) {
  const router = useRouter();

  const handleAddProjectMember = (userId: string): Promise<void> => {
    if (!activeProject) return Promise.resolve();
    setErrorMsg(null);
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        setOptimisticProjects({
          type: "add_project_member",
          projectId: activeProject.id,
          userId,
        });
        const res = await addProjectMemberAction(activeProject.id, userId);
        if (res.success) {
          setCurrentProjects((prev) =>
            prev.map((p) => {
              if (p.id !== activeProject.id) return p;
              const exists = (p.memberUserIds || []).includes(userId);
              if (exists) return p;
              return {
                ...p,
                memberUserIds: [...(p.memberUserIds || []), userId],
              };
            }),
          );
          resolve();
        } else {
          setErrorMsg(res.error || "Failed to add member.");
          reject(new Error(res.error || "Failed to add member."));
        }
      });
    });
  };

  const handleRemoveProjectMember = (userId: string): Promise<void> => {
    if (!activeProject) return Promise.resolve();
    setErrorMsg(null);
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        setOptimisticProjects({
          type: "remove_project_member",
          projectId: activeProject.id,
          userId,
        });
        const res = await removeProjectMemberAction(activeProject.id, userId);
        if (res.success) {
          setCurrentProjects((prev) =>
            prev.map((p) => {
              if (p.id !== activeProject.id) return p;
              return {
                ...p,
                memberUserIds: (p.memberUserIds || []).filter(
                  (id) => id !== userId,
                ),
              };
            }),
          );
          resolve();
        } else {
          setErrorMsg(res.error || "Failed to remove member.");
          reject(new Error(res.error || "Failed to remove member."));
        }
      });
    });
  };

  const handleCreateProject = (name: string, description?: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const tempId = "temp-" + Date.now();
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
      };
      setOptimisticProjects({ type: "create_project", project: tempProject });
      setIsCreateProjectOpen(false);
      const res = await createProjectAction(workspaceId, name, description);
      if (res.success) {
        router.refresh();
        router.push("/projects");
      } else {
        setErrorMsg(res.error || "Failed to create project.");
      }
    });
  };

  const handleCreateTask = (
    title: string,
    description?: string,
    status?: TaskStatus,
    assigneeId?: string,
    priority?: TaskPriority,
  ) => {
    if (!createTaskProjectId) return;
    setErrorMsg(null);
    startTransition(async () => {
      const selectedAssignee =
        members.find((m) => m.userId === assigneeId)?.profile || null;
      const targetProject = optimisticProjects.find(
        (p) => p.id === createTaskProjectId,
      );
      const columnId = status || (targetProject?.columns?.[0]?.id ?? "todo");

      const nextPosition = targetProject
        ? targetProject.tasks
            .filter((t) => t.columnId === columnId)
            .reduce((max, t) => Math.max(max, t.position), 0) + 1000.0
        : 1000.0;

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
      };
      setOptimisticProjects({
        type: "create_task",
        projectId: createTaskProjectId,
        task: tempTask,
      });
      setCreateTaskProjectId(null);

      const res = await createTaskAction({
        projectId: tempTask.projectId,
        title,
        description,
        columnId: tempTask.columnId,
        priority: tempTask.priority,
        assigneeId: assigneeId || undefined,
      });
      if (res.success && res.task) {
        setCurrentProjects((prev) =>
          prev.map((p) => {
            if (p.id !== createTaskProjectId) return p;
            const exists = p.tasks.some((t) => t.id === res.task!.id);
            if (exists) return p;
            return {
              ...p,
              tasks: [...p.tasks, res.task!],
            };
          }),
        );
      } else if (!res.success) {
        setErrorMsg(res.error || "Failed to create task.");
      }
    });
  };

  const handleAssigneeChange = (taskId: string, assigneeId: string | null) => {
    if (taskId.startsWith("temp-")) return;
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({
        type: "update_task_assignee",
        taskId,
        assigneeId,
      });
      const res = await updateTaskAssigneeAction(taskId, assigneeId);
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    assigneeId,
                    assignee: members.find((m) => m.userId === assigneeId)
                      ?.profile
                      ? {
                          fullName:
                            members.find((m) => m.userId === assigneeId)!
                              .profile!.fullName || null,
                          email:
                            members.find((m) => m.userId === assigneeId)!
                              .profile!.email || "",
                          avatarUrl:
                            members.find((m) => m.userId === assigneeId)!
                              .profile!.avatarUrl || null,
                        }
                      : undefined,
                  }
                : t,
            ),
          })),
        );
      } else {
        setErrorMsg(res.error || "Failed to update task assignee.");
      }
    });
  };

  const handleMoveTask = (
    taskId: string,
    columnId: string,
    position: number,
  ) => {
    if (taskId.startsWith("temp-")) return;
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({ type: "move_task", taskId, columnId, position });
      const res = await moveTaskAction(taskId, columnId, position);
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === taskId
                ? { ...t, columnId, status: columnId, position }
                : t,
            ),
          })),
        );
      } else {
        setErrorMsg(res.error || "Failed to move task.");
      }
    });
  };

  const handleUpdateTask = (
    taskId: string,
    updates: {
      title?: string;
      description?: string | null;
      priority?: TaskPriority;
    },
  ) => {
    if (taskId.startsWith("temp-")) return;
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({ type: "update_task", taskId, updates });
      const res = await updateTaskAction(taskId, updates);
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === taskId ? { ...t, ...updates } : t,
            ),
          })),
        );
      } else {
        setErrorMsg(res.error || "Failed to update task.");
      }
    });
  };

  const handleCreateColumn = (name: string) => {
    if (!activeProjectId) return;
    setErrorMsg(null);
    const activeProj = currentProjects.find((p) => p.id === activeProjectId);
    if (activeProj && (activeProj.columns || []).length >= 5) {
      setErrorMsg("A project cannot have more than 5 columns.");
      return;
    }
    startTransition(async () => {
      const nextPos = activeProj
        ? (activeProj.columns || []).reduce(
            (max, c) => Math.max(max, c.position),
            0,
          ) + 1000.0
        : 1000.0;
      const tempColumn: Column = {
        id: "temp-" + Date.now(),
        boardId: activeProjectId,
        name,
        position: nextPos,
        createdAt: new Date().toISOString(),
      };
      setOptimisticProjects({
        type: "create_column",
        projectId: activeProjectId,
        column: tempColumn,
      });
      const { createColumnAction } = await import(
        "@/features/kanbanboard/actions/create-column.action"
      );
      const res = await createColumnAction(activeProjectId, name);
      if (res.success && res.column) {
        setCurrentProjects((prev) =>
          prev.map((p) => {
            if (p.id !== activeProjectId) return p;
            const exists = (p.columns || []).some(
              (c) => c.id === res.column!.id,
            );
            if (exists) return p;
            return {
              ...p,
              columns: [...(p.columns || []), res.column!],
            };
          }),
        );
      } else if (!res.success) {
        setErrorMsg(res.error || "Failed to create column.");
      }
    });
  };

  const handleRenameColumn = (columnId: string, name: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({ type: "rename_column", columnId, name });
      const { updateColumnNameAction } = await import(
        "@/features/kanbanboard/actions/update-column-name.action"
      );
      const res = await updateColumnNameAction(columnId, name);
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) => {
            if (p.id !== activeProjectId) return p;
            return {
              ...p,
              columns: (p.columns || []).map((c) =>
                c.id === columnId ? { ...c, name } : c,
              ),
            };
          }),
        );
      } else {
        setErrorMsg(res.error || "Failed to rename column.");
      }
    });
  };

  const handleMoveColumn = (columnId: string, position: number) => {
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({ type: "move_column", columnId, position });
      const { moveColumnAction } = await import(
        "@/features/kanbanboard/actions/move-column.action"
      );
      const res = await moveColumnAction(columnId, position);
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) => {
            if (p.id !== activeProjectId) return p;
            return {
              ...p,
              columns: (p.columns || []).map((c) =>
                c.id === columnId ? { ...c, position } : c,
              ),
            };
          }),
        );
      } else {
        setErrorMsg(res.error || "Failed to move column.");
      }
    });
  };

  const handleDeleteColumn = (
    columnId: string,
    action: "move" | "delete",
    targetColumnId?: string,
  ) => {
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({
        type: "delete_column",
        columnId,
        action,
        targetColumnId,
      });
      const { deleteColumnAction } = await import(
        "@/features/kanbanboard/actions/delete-column.action"
      );
      const res = await deleteColumnAction(columnId, action, targetColumnId);
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) => {
            if (p.id === activeProjectId) {
              const newColumns = (p.columns || []).filter(
                (c) => c.id !== columnId,
              );
              let newTasks = p.tasks;
              if (action === "delete") {
                newTasks = p.tasks.filter((t) => t.columnId !== columnId);
              } else if (action === "move" && targetColumnId) {
                newTasks = p.tasks.map((t) =>
                  t.columnId === columnId
                    ? { ...t, columnId: targetColumnId, status: targetColumnId }
                    : t,
                );
              }
              return {
                ...p,
                columns: newColumns,
                tasks: newTasks,
              };
            }
            return p;
          }),
        );
      } else {
        setErrorMsg(res.error || "Failed to delete column.");
      }
    });
  };

  const handleUpdateProject = (
    projectId: string,
    name: string,
    description?: string,
  ) => {
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({
        type: "update_project",
        projectId,
        name,
        description,
      });
      setProjectToEdit(null);
      const { updateProjectAction } = await import(
        "../actions/update-project.action"
      );
      const res = await updateProjectAction(projectId, name, description);
      if (res.success) {
        setCurrentProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, name, description: description || null }
              : p,
          ),
        );
      } else {
        setErrorMsg(res.error || "Failed to update project.");
      }
    });
  };

  const cycleTaskStatus = (taskId: string, currentStatus: string) => {
    const project = currentProjects.find((p) =>
      p.tasks.some((t) => t.id === taskId),
    );
    if (!project) return;
    const cols = [...(project.columns || [])].sort(
      (a, b) => a.position - b.position,
    );
    if (cols.length === 0) return;
    const currentIndex = cols.findIndex((c) => c.id === currentStatus);
    const nextIndex = (currentIndex + 1) % cols.length;
    const nextColumn = cols[nextIndex];
    const targetTasks = project.tasks.filter(
      (t) => t.columnId === nextColumn.id,
    );
    const nextPosition =
      (targetTasks[targetTasks.length - 1]?.position ?? 0) + 1000.0;
    handleMoveTask(taskId, nextColumn.id, nextPosition);
  };

  const handleDeleteConfirmSubmit = () => {
    if (!deleteTarget) return;
    setErrorMsg(null);
    const target = deleteTarget;
    setDeleteTarget(null);
    startTransition(async () => {
      let res;
      if (target.type === "project") {
        setOptimisticProjects({ type: "delete_project", projectId: target.id });
        res = await deleteProjectAction(target.id);
        if (res.success) {
          if (activeProjectId === target.id) {
            router.push("/projects");
          }
          router.refresh();
        }
      } else {
        setOptimisticProjects({ type: "delete_task", taskId: target.id });
        res = await deleteTaskAction(target.id);
      }

      if (res.success) {
        if (target.type === "task") {
          setCurrentProjects((prev) =>
            prev.map((p) => ({
              ...p,
              tasks: p.tasks.filter((t) => t.id !== target.id),
            })),
          );
        } else if (target.type === "project") {
          setCurrentProjects((prev) => prev.filter((p) => p.id !== target.id));
        }
      } else {
        setErrorMsg(res.error || "Failed to execute delete action.");
      }
    });
  };

  return {
    handleAddProjectMember,
    handleRemoveProjectMember,
    handleCreateProject,
    handleCreateTask,
    handleAssigneeChange,
    handleMoveTask,
    handleUpdateTask,
    handleCreateColumn,
    handleRenameColumn,
    handleMoveColumn,
    handleDeleteColumn,
    handleUpdateProject,
    cycleTaskStatus,
    handleDeleteConfirmSubmit,
  };
}
