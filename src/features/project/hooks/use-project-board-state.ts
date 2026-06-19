import { useState, useOptimistic } from "react";
import { useBoardRealtime } from "./use-board-realtime";
import type {
  Project,
  Task,
  Column,
  TaskPriority,
  TaskType,
} from "../types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";

export type OptimisticAction =
  | {
      type: "update_task_assignee";
      taskId: string;
      assigneeId: string | null;
    }
  | { type: "delete_task"; taskId: string }
  | { type: "delete_project"; projectId: string }
  | { type: "add_project_member"; projectId: string; userId: string }
  | { type: "remove_project_member"; projectId: string; userId: string }
  | {
      type: "create_project";
      project: Project & { tasks: Task[]; columns: Column[] };
    }
  | { type: "create_task"; projectId: string; task: Task }
  | {
      type: "move_task";
      taskId: string;
      columnId: string;
      position: number;
    }
  | { type: "create_column"; projectId: string; column: Column }
  | { type: "rename_column"; columnId: string; name: string }
  | { type: "move_column"; columnId: string; position: number }
  | {
      type: "delete_column";
      columnId: string;
      action: "move" | "delete";
      targetColumnId?: string;
    }
  | {
      type: "update_project";
      projectId: string;
      name: string;
      description?: string;
    }
  | {
      type: "update_task";
      taskId: string;
      updates: { title?: string; description?: string | null; priority?: TaskPriority; type?: TaskType };
    };

export interface UseProjectBoardStateProps {
  projects: (Project & { tasks: Task[]; columns: Column[] })[];
  members: WorkspaceMember[];
  activeProjectId: string | null;
}

export function useProjectBoardState({
  projects,
  members,
  activeProjectId,
}: UseProjectBoardStateProps) {
  const [prevProjects, setPrevProjects] = useState(projects);
  const [currentProjects, setCurrentProjects] = useState(projects);

  if (projects !== prevProjects) {
    setPrevProjects(projects);
    setCurrentProjects(projects);
  }

  // React 19 Optimistic state hook for immediate UI feedback on CRUD operations
  const [optimisticProjects, setOptimisticProjects] = useOptimistic(
    currentProjects,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case "update_task_assignee": {
          const member = members.find((m) => m.userId === action.assigneeId);
          const assignee = member
            ? {
                fullName: member.profile?.fullName || null,
                email: member.profile?.email || "",
                avatarUrl: member.profile?.avatarUrl || null,
              }
            : null;
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === action.taskId
                ? {
                    ...t,
                    assigneeId: action.assigneeId,
                    assignee: assignee || undefined,
                  }
                : t,
            ),
          }));
        }
        case "delete_task":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.filter((t) => t.id !== action.taskId),
          }));
        case "update_task":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === action.taskId ? { ...t, ...action.updates } : t
            ),
          }));
        case "delete_project":
          return state.filter((p) => p.id !== action.projectId);
        case "update_project":
          return state.map((p) =>
            p.id === action.projectId
              ? {
                  ...p,
                  name: action.name,
                  description: action.description || null,
                }
              : p,
          );
        case "add_project_member":
          return state.map((p) =>
            p.id === action.projectId
              ? {
                  ...p,
                  memberUserIds: [...(p.memberUserIds || []), action.userId],
                }
              : p,
          );
        case "remove_project_member":
          return state.map((p) =>
            p.id === action.projectId
              ? {
                  ...p,
                  memberUserIds: (p.memberUserIds || []).filter(
                    (id) => id !== action.userId,
                  ),
                }
              : p,
          );
        case "create_project":
          return [...state, action.project];
        case "create_task":
          return state.map((p) => {
            if (p.id !== action.projectId) return p;
            const taskExists = p.tasks.some(
              (t) =>
                t.id === action.task.id ||
                t.title.toLowerCase() === action.task.title.toLowerCase(),
            );
            if (taskExists) return p;
            return { ...p, tasks: [...p.tasks, action.task] };
          });
        case "move_task":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === action.taskId
                ? {
                    ...t,
                    columnId: action.columnId,
                    status: action.columnId,
                    position: action.position,
                  }
                : t,
            ),
          }));
        case "create_column":
          return state.map((p) => {
            if (p.id !== action.projectId) return p;
            const columnExists = (p.columns || []).some(
              (c) =>
                c.id === action.column.id ||
                c.name.toLowerCase() === action.column.name.toLowerCase(),
            );
            if (columnExists) return p;
            return { ...p, columns: [...(p.columns || []), action.column] };
          });
        case "rename_column":
          return state.map((p) => ({
            ...p,
            columns: (p.columns || []).map((c) =>
              c.id === action.columnId ? { ...c, name: action.name } : c,
            ),
          }));
        case "move_column":
          return state.map((p) => ({
            ...p,
            columns: (p.columns || []).map((c) =>
              c.id === action.columnId
                ? { ...c, position: action.position }
                : c,
            ),
          }));
        case "delete_column":
          return state.map((p) => {
            const newColumns = (p.columns || []).filter(
              (c) => c.id !== action.columnId,
            );
            let newTasks = p.tasks;
            if (action.action === "delete") {
              newTasks = p.tasks.filter((t) => t.columnId !== action.columnId);
            } else if (action.action === "move" && action.targetColumnId) {
              newTasks = p.tasks.map((t) =>
                t.columnId === action.columnId
                  ? {
                      ...t,
                      columnId: action.targetColumnId!,
                      status: action.targetColumnId!,
                    }
                  : t,
              );
            }
            return {
              ...p,
              columns: newColumns,
              tasks: newTasks,
            };
          });
        default:
          return state;
      }
    },
  );

  // Realtime subscription using the single board realtime reconciler
  useBoardRealtime({
    projectId: activeProjectId,
    members,
    onColumnInsert: (newCol) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            const exists = (p.columns || []).some((c) => c.id === newCol.id);
            if (exists) return p;
            return {
              ...p,
              columns: [...(p.columns || []), newCol],
            };
          }
          return p;
        }),
      );
    },
    onColumnUpdate: (updatedCol) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              columns: (p.columns || []).map((c) =>
                c.id === updatedCol.id ? updatedCol : c,
              ),
            };
          }
          return p;
        }),
      );
    },
    onColumnDelete: (deletedColId) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              columns: (p.columns || []).filter((c) => c.id !== deletedColId),
            };
          }
          return p;
        }),
      );
    },
    onTaskInsert: (newTask) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            const exists = p.tasks.some((t) => t.id === newTask.id);
            if (exists) return p;
            return {
              ...p,
              tasks: [...p.tasks, newTask],
            };
          }
          return p;
        }),
      );
    },
    onTaskUpdate: (updatedTask) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === updatedTask.id ? updatedTask : t,
              ),
            };
          }
          return p;
        }),
      );
    },
    onTaskDelete: (deletedTaskId) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              tasks: p.tasks.filter((t) => t.id !== deletedTaskId),
            };
          }
          return p;
        }),
      );
    },
    onProjectMemberInsert: (userId) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            const exists = (p.memberUserIds || []).includes(userId);
            if (exists) return p;
            return {
              ...p,
              memberUserIds: [...(p.memberUserIds || []), userId],
            };
          }
          return p;
        }),
      );
    },
    onProjectMemberDelete: (userId) => {
      setCurrentProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              memberUserIds: (p.memberUserIds || []).filter((id) => id !== userId),
            };
          }
          return p;
        }),
      );
    },
  });

  return {
    currentProjects,
    setCurrentProjects,
    optimisticProjects,
    setOptimisticProjects,
  };
}
