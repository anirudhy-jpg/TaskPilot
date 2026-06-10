"use client";

import React, { useState, useTransition, Suspense, useOptimistic } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Plus,
  FolderKanban,
  Trash2,
  X,
  ArrowRight,
  ArrowLeft,
  Circle,
  Clock,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, Task, TaskStatus, TaskPriority, WorkspaceMember } from "@/types/workspace.types";
import {
  createProjectAction,
  createTaskAction,
  updateTaskStatusAction,
  updateTaskAssigneeAction,
  deleteTaskAction,
  deleteProjectAction,
  addProjectMemberAction,
  removeProjectMemberAction,
  batchUpdateTaskPositionsAction,
} from "@/actions/workspace/workspace.actions";

// Import custom modals
import { CreateProjectModal } from "./modals/CreateProjectModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { DeleteConfirmModal } from "./modals/DeleteConfirmModal";
import { ManageProjectMembersModal } from "./modals/ManageProjectMembersModal";
const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl bg-white/40 border border-amber-900/5 p-5 min-h-[600px] w-full">
            <div className="h-6 w-24 bg-slate-200/60 rounded-lg mb-4" />
            <div className="space-y-3.5">
              {[0, 1].map((j) => (
                <div key={j} className="h-32 bg-white/60 rounded-2xl border border-amber-900/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  }
);
import { ProjectsDashboardGrid } from "./ProjectsDashboardGrid";

interface ProjectsListProps {
  projects: (Project & { tasks: Task[] })[];
  workspaceId: string;
  members: WorkspaceMember[];
  currentUserId?: string;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; color: string; icon: typeof Circle }
> = {
  todo: { label: "To Do", color: "text-[#9bb0a5]", icon: Circle },
  in_progress: {
    label: "In Progress",
    color: "text-[#dca15c]",
    icon: Clock,
  },
  done: {
    label: "Done",
    color: "text-rose-600",
    icon: CheckCircle2,
  },
};

function BoardContent({ projects, workspaceId, members, currentUserId }: ProjectsListProps) {
  const router = useRouter();
  const params = useParams();
  const activeProjectId = params?.projectId as string || null;

  // React 19 Optimistic state hook for immediate UI feedback on CRUD operations
  const [optimisticProjects, setOptimisticProjects] = useOptimistic(
    projects,
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
          }));
        case "update_task_assignee":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === action.taskId ? { ...t, assigneeId: action.assigneeId } : t
            ),
          }));
        case "delete_task":
          return state.map((p) => ({
            ...p,
            tasks: p.tasks.filter((t) => t.id !== action.taskId),
          }));
        case "delete_project":
          return state.filter((p) => p.id !== action.projectId);
        case "add_project_member":
          return state.map((p) =>
            p.id === action.projectId
              ? { ...p, memberUserIds: [...(p.memberUserIds || []), action.userId] }
              : p
          );
        case "remove_project_member":
          return state.map((p) =>
            p.id === action.projectId
              ? { ...p, memberUserIds: (p.memberUserIds || []).filter((id) => id !== action.userId) }
              : p
          );
        case "create_project":
          return [...state, action.project];
        case "create_task":
          return state.map((p) =>
            p.id === action.projectId
              ? { ...p, tasks: [...p.tasks, action.task] }
              : p
          );
        case "reorder_tasks": {
          const updateMap = new Map(
            action.updates.map((u) => [u.id, u])
          );
          return state.map((p) =>
            p.id === action.projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) => {
                    const update = updateMap.get(t.id);
                    if (update) {
                      return { ...t, status: update.status, position: update.position };
                    }
                    return t;
                  }),
                }
              : p
          );
        }
        default:
          return state;
      }
    }
  );

  const activeProject = optimisticProjects.find((p) => p.id === activeProjectId);

  // Find project members & eligible workspace members
  const workspaceOwner = members.find((m) => m.role === "owner");
  const isWorkspaceOwner = workspaceOwner?.userId === currentUserId;

  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const currentUserRole = currentUserMember?.role || (isWorkspaceOwner ? "owner" : "member");
  const isWorkspaceMember = currentUserRole === "member";

  const projectMemberUserIds = activeProject?.memberUserIds || [];
  const currentProjectMembers = members.filter((m) => projectMemberUserIds.includes(m.userId));
  const eligibleMembers = members.filter((m) => !projectMemberUserIds.includes(m.userId));

  // Modal State Variables
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "project" | "task";
    id: string;
    name: string;
  } | null>(null);

  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddProjectMember = (userId: string): Promise<void> => {
    if (!activeProject) return Promise.resolve();
    setErrorMsg(null);
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        setOptimisticProjects({ type: "add_project_member", projectId: activeProject.id, userId });
        const res = await addProjectMemberAction(activeProject.id, userId);
        if (res.success) {
          router.refresh();
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
        setOptimisticProjects({ type: "remove_project_member", projectId: activeProject.id, userId });
        const res = await removeProjectMemberAction(activeProject.id, userId);
        if (res.success) {
          router.refresh();
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
        memberUserIds: [currentUserId || ""],
      };
      setOptimisticProjects({ type: "create_project", project: tempProject });
      setIsCreateProjectOpen(false);
      const res = await createProjectAction(workspaceId, name, description);
      if (res.success) {
        if (res.projectId) {
          router.push(`/projects/${res.projectId}`);
        } else {
          router.refresh();
        }
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
      const selectedAssignee = members.find((m) => m.userId === assigneeId)?.profile || null;
      const targetProject = optimisticProjects.find((p) => p.id === createTaskProjectId);
      const nextPosition = targetProject
        ? targetProject.tasks.filter((t) => t.status === (status || "todo")).length
        : 0;

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
        assignee: selectedAssignee ? {
          fullName: selectedAssignee.fullName || null,
          email: selectedAssignee.email || "",
          avatarUrl: selectedAssignee.avatarUrl || null,
        } : undefined,
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
        status: tempTask.status,
        priority: tempTask.priority,
        assigneeId: assigneeId || undefined,
      });
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to create task.");
      }
    });
  };

  function handleStatusChange(taskId: string, status: TaskStatus) {
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({ type: "update_task_status", taskId, status });
      const res = await updateTaskStatusAction(taskId, status);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to update task status.");
      }
    });
  }

  function handleAssigneeChange(taskId: string, assigneeId: string | null) {
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({ type: "update_task_assignee", taskId, assigneeId });
      const res = await updateTaskAssigneeAction(taskId, assigneeId);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to update task assignee.");
      }
    });
  }

  function cycleTaskStatus(taskId: string, currentStatus: TaskStatus) {
    const nextStatus: TaskStatus =
      currentStatus === "todo"
        ? "in_progress"
        : currentStatus === "in_progress"
          ? "done"
          : "todo";
    handleStatusChange(taskId, nextStatus);
  }

  function handleTasksReorder(
    updates: { id: string; status: TaskStatus; position: number }[]
  ) {
    if (!activeProject) return;
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticProjects({
        type: "reorder_tasks",
        projectId: activeProject.id,
        updates,
      });
      const res = await batchUpdateTaskPositionsAction(updates);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to save task positions.");
      }
    });
  }

  function handleDeleteConfirmSubmit() {
    if (!deleteTarget) return;
    setErrorMsg(null);
    const target = deleteTarget;
    setDeleteTarget(null);
    startTransition(async () => {
      let res;
      if (target.type === "project") {
        setOptimisticProjects({ type: "delete_project", projectId: target.id });
        res = await deleteProjectAction(target.id);
        if (res.success && activeProjectId === target.id) {
          router.push("/projects");
        }
      } else {
        setOptimisticProjects({ type: "delete_task", taskId: target.id });
        res = await deleteTaskAction(target.id);
      }

      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to execute delete action.");
      }
    });
  }

  return (
    <div className="space-y-6 flex flex-col h-full w-full select-none relative">
      {/* Premium top linear loading bar showing sync state */}
      {isPending && (
        <div className="fixed top-14 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-yellow-500 z-[9999] overflow-hidden">
          <div className="h-full bg-amber-450 animate-pulse w-full" />
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/10 pb-5">
        <div>
          {activeProject ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 font-extrabold text-xs shadow-3xs border border-amber-500/20 shrink-0">
                  {activeProject.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl">
                    {activeProject.name}
                  </h1>

                  {/* Overlapping Avatar Stack of Project Members */}
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                    <div className="flex items-center">
                      {currentProjectMembers.slice(0, 4).map((m, i) => (
                        <div
                          key={m.userId}
                          className={`w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 border border-white flex items-center justify-center font-extrabold text-[9px] shadow-2xs shrink-0 select-none ${
                            i > 0 ? "-ml-2" : ""
                          }`}
                          title={m.profile?.fullName || m.profile?.email}
                        >
                          {(m.profile?.fullName || m.profile?.email || "?")[0].toUpperCase()}
                        </div>
                      ))}
                      {currentProjectMembers.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border border-white flex items-center justify-center font-bold text-[8px] -ml-2 shadow-2xs select-none">
                          +{currentProjectMembers.length - 4}
                        </div>
                      )}
                    </div>

                    {isWorkspaceOwner && (
                      <button
                        onClick={() => setIsManageMembersOpen(true)}
                        className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        title="Manage project members"
                      >
                        <UserPlus size={14} />
                      </button>
                    )}
                  </div>

                  {!isWorkspaceMember && (
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: "project",
                          id: activeProject.id,
                          name: activeProject.name,
                        })
                      }
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              {activeProject.description && (
                <p className="text-xs text-slate-550 mt-1.5 pl-11 max-w-2xl leading-relaxed">
                  {activeProject.description}
                </p>
              )}
              {(activeProject.creatorEmail || activeProject.creatorName) && (
                <p className="text-[10px] text-slate-400 pl-11 mt-1 font-semibold">
                  created by: <span className="text-slate-550 font-bold">{activeProject.creatorName || activeProject.creatorEmail}</span>
                </p>
              )}
            </>
          ) : (
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Projects Dashboard
              </h1>
              <p className="text-xs text-slate-505 mt-0.5">
                Overview of all active projects and task pipelines
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeProject ? (
            <Link href="/projects">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/20 hover:bg-amber-500/5 text-amber-600 cursor-pointer text-xs font-semibold rounded-xl"
              >
                <span>Back to Projects</span>
              </Button>
            </Link>
          ) : (
            !isWorkspaceMember && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-3xs text-xs font-black rounded-xl px-4 py-2"
                onClick={() => setIsCreateProjectOpen(true)}
              >
                <Plus size={14} className="mr-1.5" />
                <span>New Project</span>
              </Button>
            )
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-605 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Main Content Views ─────────────────────────────────────────── */}
      <div className="transition-all duration-300">
        {activeProject ? (
          /* ─── VIEW 1: KANBAN BOARD ─── */
          <KanbanBoard
            project={activeProject}
            members={members}
            currentUserId={currentUserId}
            onAddTask={(status) => {
              setNewTaskStatus(status);
              setCreateTaskProjectId(activeProject.id);
            }}
            onDeleteTask={(id, title) =>
              setDeleteTarget({ type: "task", id, name: title })
            }
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onTasksReorder={handleTasksReorder}
          />
        ) : (
          /* ─── VIEW 2: ALL PROJECTS GRID ─── */
          <ProjectsDashboardGrid
            optimisticProjects={optimisticProjects}
            statusConfig={statusConfig}
            cycleTaskStatus={cycleTaskStatus}
            setDeleteTarget={setDeleteTarget}
            setNewTaskStatus={setNewTaskStatus}
            setCreateTaskProjectId={setCreateTaskProjectId}
            setIsCreateProjectOpen={setIsCreateProjectOpen}
            isWorkspaceMember={isWorkspaceMember}
          />
        )}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────── */}

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        isPending={isPending}
        onCreate={handleCreateProject}
      />

      <CreateTaskModal
        key={createTaskProjectId ? `${createTaskProjectId}-${newTaskStatus}` : "closed"}
        isOpen={!!createTaskProjectId}
        onClose={() => setCreateTaskProjectId(null)}
        projectName={
          optimisticProjects.find((p) => p.id === createTaskProjectId)?.name || ""
        }
        isPending={isPending}
        initialStatus={newTaskStatus}
        onCreate={handleCreateTask}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        type={deleteTarget?.type || "project"}
        name={deleteTarget?.name || ""}
        isPending={isPending}
        onConfirm={handleDeleteConfirmSubmit}
      />

      <ManageProjectMembersModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        projectId={activeProject?.id || ""}
        projectName={activeProject?.name || ""}
        currentMembers={currentProjectMembers}
        eligibleMembers={eligibleMembers}
        onAddMember={handleAddProjectMember}
        onRemoveMember={handleRemoveProjectMember}
      />
    </div>
  );
}

export function ProjectsList(props: ProjectsListProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Loading workspace board...
        </div>
      }
    >
      <BoardContent {...props} />
    </Suspense>
  );
}
