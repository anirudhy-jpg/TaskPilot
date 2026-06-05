"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, Task, TaskStatus } from "@/types/workspace.types";
import {
  createProjectAction,
  createTaskAction,
  updateTaskStatusAction,
  deleteTaskAction,
  deleteProjectAction,
} from "@/actions/workspace/workspace.actions";

// Import custom modals
import { CreateProjectModal } from "./modals/CreateProjectModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { DeleteConfirmModal } from "./modals/DeleteConfirmModal";
import { KanbanBoard } from "./KanbanBoard";

interface ProjectsListProps {
  projects: (Project & { tasks: Task[] })[];
  workspaceId: string;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; color: string; icon: typeof Circle }
> = {
  todo: { label: "To Do", color: "text-slate-400", icon: Circle },
  in_progress: {
    label: "In Progress",
    color: "text-amber-500",
    icon: Clock,
  },
  done: {
    label: "Done",
    color: "text-emerald-500",
    icon: CheckCircle2,
  },
};

function BoardContent({ projects, workspaceId }: ProjectsListProps) {
  const router = useRouter();
  const params = useParams();
  const activeProjectId = params?.projectId as string || null;

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Modal State Variables
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "project" | "task";
    id: string;
    name: string;
  } | null>(null);

  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ─── Actions ────────────────────────────────────────────────
  const handleCreateProject = (name: string, description?: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createProjectAction(workspaceId, name, description);
      if (res.success) {
        setIsCreateProjectOpen(false);
      } else {
        setErrorMsg(res.error || "Failed to create project.");
      }
    });
  };

  const handleCreateTask = (
    title: string,
    description?: string,
    status?: TaskStatus,
  ) => {
    if (!createTaskProjectId) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createTaskAction({
        projectId: createTaskProjectId,
        title,
        description,
        status: status || "todo",
        priority: "medium",
      });
      if (res.success) {
        setCreateTaskProjectId(null);
      } else {
        setErrorMsg(res.error || "Failed to create task.");
      }
    });
  };

  function handleStatusChange(taskId: string, status: TaskStatus) {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, status);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update task status.");
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

  function handleDeleteConfirmSubmit() {
    if (!deleteTarget) return;
    setErrorMsg(null);
    startTransition(async () => {
      let res;
      if (deleteTarget.type === "project") {
        res = await deleteProjectAction(deleteTarget.id);
        if (res.success && activeProjectId === deleteTarget.id) {
          router.push("/projects");
        }
      } else {
        res = await deleteTaskAction(deleteTarget.id);
      }

      if (res.success) {
        setDeleteTarget(null);
      } else {
        setErrorMsg(res.error || "Failed to execute delete action.");
        setDeleteTarget(null);
      }
    });
  }



  return (
    <div className="space-y-6 flex flex-col h-full w-full select-none">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          {activeProject ? (
            <>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight sm:text-2xl">
                  {activeProject.name}
                </h1>
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
              </div>
              {activeProject.description && (
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  {activeProject.description}
                </p>
              )}
            </>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Projects Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
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
                className="border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer text-xs font-semibold"
              >
                <span>Back to Projects</span>
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              className="bg-[#2d4a3e] hover:bg-[#1e3a2e] text-white cursor-pointer shadow-sm text-xs font-semibold"
              onClick={() => setIsCreateProjectOpen(true)}
            >
              <Plus size={14} className="mr-1.5" />
              <span>New Project</span>
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Main Content Views ─────────────────────────────── */}
      {activeProject ? (
        /* ─── VIEW 1: KANBAN BOARD ─── */
        <KanbanBoard
          project={activeProject}
          isPending={isPending}
          onAddTask={(status) => {
            setNewTaskStatus(status);
            setCreateTaskProjectId(activeProject.id);
          }}
          onDeleteProject={(id, name) =>
            setDeleteTarget({ type: "project", id, name })
          }
          onDeleteTask={(id, title) =>
            setDeleteTarget({ type: "task", id, name: title })
          }
          onStatusChange={handleStatusChange}
        />
      ) : (
        /* ─── VIEW 2: ALL PROJECTS GRID ─── */
        <>
          {projects.length === 0 ? (
            <div className="p-12 rounded-xl bg-white border border-slate-200 text-center shadow-sm max-w-lg mx-auto mt-8">
              <div className="text-4xl mb-4">📂</div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                No Projects Yet
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Create a project to start planning workloads and managing
                pipelines.
              </p>
              <Button
                size="sm"
                className="bg-[#2d4a3e] hover:bg-[#1e3a2e] text-white cursor-pointer"
                onClick={() => setIsCreateProjectOpen(true)}
              >
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => {
                const totalTasks = project.tasks?.length || 0;
                const completedTasks =
                  project.tasks?.filter((t) => t.status === "done").length || 0;
                const progressPercent =
                  totalTasks > 0
                    ? Math.round((completedTasks / totalTasks) * 100)
                    : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() =>
                      router.push(`/projects/${project.id}`)
                    }
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-[#2d4a3e]/30 transition-all duration-200 flex flex-col justify-between min-h-[380px] group cursor-pointer"
                  >
                    {/* Card Top Details */}
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <FolderKanban size={16} className="text-[#2d4a3e]" />
                          <span className="text-sm font-extrabold text-slate-900 group-hover:text-[#2d4a3e] group-hover:underline truncate max-w-[170px]">
                            {project.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({
                              type: "project",
                              id: project.id,
                              name: project.name,
                            });
                          }}
                          className="text-slate-350 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {project.description ? (
                        <p className="text-[11px] text-slate-450 leading-relaxed truncate-2-lines mb-4 h-8 overflow-hidden">
                          {project.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-350 italic mb-4 h-8">
                          No description provided.
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                          <span>Progress</span>
                          <span>
                            {completedTasks}/{totalTasks} tasks (
                            {progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2d4a3e] rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Mini task list overview */}
                      <div className="border-t border-slate-100 pt-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Tasks Pipeline
                        </div>
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                          {project.tasks && project.tasks.length > 0 ? (
                            project.tasks.map((task) => {
                              const cfg = statusConfig[task.status];
                              const StatusIcon = cfg.icon;

                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-slate-50 transition-colors group/task"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cycleTaskStatus(task.id, task.status);
                                      }}
                                      className={`${cfg.color} hover:opacity-80 transition-opacity cursor-pointer shrink-0`}
                                      title={`Status: ${cfg.label}. Click to cycle.`}
                                    >
                                      <StatusIcon size={12} />
                                    </button>
                                    <span
                                      className={`text-[11px] truncate ${
                                        task.status === "done"
                                          ? "line-through text-slate-400"
                                          : "text-slate-700 font-medium"
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({
                                        type: "task",
                                        id: task.id,
                                        name: task.title,
                                      });
                                    }}
                                    className="text-slate-350 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                                    title="Delete task"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-355 italic pl-1">
                              No tasks in this project.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#2d4a3e] group-hover:underline">
                        Open Board &rarr;
                      </span>

                      <Button
                        size="xs"
                        variant="outline"
                        className="border-[#2d4a3e]/30 hover:bg-[#2d4a3e]/5 text-[#2d4a3e] cursor-pointer text-[10px] font-bold px-2.5 py-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewTaskStatus("todo");
                          setCreateTaskProjectId(project.id);
                        }}
                      >
                        <Plus size={10} className="mr-1" />
                        <span>Add Task</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── MODALS ─────────────────────────────────────────── */}

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        isPending={isPending}
        onCreate={handleCreateProject}
      />

      <CreateTaskModal
        isOpen={!!createTaskProjectId}
        onClose={() => setCreateTaskProjectId(null)}
        projectName={
          projects.find((p) => p.id === createTaskProjectId)?.name || ""
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
