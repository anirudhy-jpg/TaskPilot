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
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, Task, TaskStatus, WorkspaceMember } from "@/types/workspace.types";
import {
  createProjectAction,
  createTaskAction,
  updateTaskStatusAction,
  updateTaskAssigneeAction,
  deleteTaskAction,
  deleteProjectAction,
  addProjectMemberAction,
  removeProjectMemberAction,
} from "@/actions/workspace/workspace.actions";

// Import custom modals
import { CreateProjectModal } from "./modals/CreateProjectModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { DeleteConfirmModal } from "./modals/DeleteConfirmModal";
import { ManageProjectMembersModal } from "./modals/ManageProjectMembersModal";
import { KanbanBoard } from "./KanbanBoard";

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

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Find project members & eligible workspace members
  const workspaceOwner = members.find((m) => m.role === "owner");
  const isWorkspaceOwner = workspaceOwner?.userId === currentUserId;

  const projectMemberUserIds = activeProject?.memberUserIds || [];
  const currentProjectMembers = members.filter((m) => projectMemberUserIds.includes(m.userId));
  const eligibleMembers = members.filter((m) => !projectMemberUserIds.includes(m.userId));

  // Modal State Variables
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
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

  const handleAddProjectMember = async (userId: string) => {
    if (!activeProject) return;
    const res = await addProjectMemberAction(activeProject.id, userId);
    if (res.success) {
      router.refresh();
    } else {
      throw new Error(res.error || "Failed to add member.");
    }
  };

  const handleRemoveProjectMember = async (userId: string) => {
    if (!activeProject) return;
    const res = await removeProjectMemberAction(activeProject.id, userId);
    if (res.success) {
      router.refresh();
    } else {
      throw new Error(res.error || "Failed to remove member.");
    }
  };

  // ─── Actions ────────────────────────────────────────────────
  const handleCreateProject = (name: string, description?: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createProjectAction(workspaceId, name, description);
      if (res.success) {
        setIsCreateProjectOpen(false);
        router.refresh();
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
        assigneeId: assigneeId || undefined,
      });
      if (res.success) {
        setCreateTaskProjectId(null);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to create task.");
      }
    });
  };

  function handleStatusChange(taskId: string, status: TaskStatus) {
    setErrorMsg(null);
    startTransition(async () => {
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
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to execute delete action.");
        setDeleteTarget(null);
      }
    });
  }



  return (
    <div className="space-y-6 flex flex-col h-full w-full select-none">
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
                className="border-amber-500/20 hover:bg-amber-500/5 text-amber-600 cursor-pointer text-xs font-semibold rounded-xl"
              >
                <span>Back to Projects</span>
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-3xs text-xs font-black rounded-xl px-4 py-2"
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
              <p className="text-xs text-slate-550 mb-4 leading-relaxed">
                Create a project to start planning workloads and managing
                pipelines.
              </p>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold cursor-pointer"
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
                    className="bg-white/70 backdrop-blur-md border border-amber-900/5 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.03)] hover:shadow-[0_16px_32px_-8px_rgba(245,158,11,0.1)] hover:-translate-y-1 hover:border-amber-500/20 transition-all duration-305 flex flex-col justify-between min-h-[380px] group cursor-pointer"
                  >
                    {/* Card Top Details */}
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <FolderKanban size={16} className="text-amber-600" />
                          <span className="text-sm font-extrabold text-slate-800 group-hover:text-amber-700 group-hover:underline truncate max-w-[170px]">
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
                        <p className="text-[11px] text-slate-500 leading-relaxed truncate-2-lines mb-4 h-8 overflow-hidden">
                          {project.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic mb-4 h-8">
                          No description provided.
                        </p>
                      )}

                      {(project.creatorEmail || project.creatorName) && (
                        <p className="text-[10px] text-slate-450 font-semibold mb-3 -mt-2">
                          created by: <span className="text-slate-600 font-bold">{project.creatorName || project.creatorEmail}</span>
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
                        <div className="w-full h-1.5 bg-amber-500/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Mini task list overview */}
                      <div className="border-t border-amber-955/10 pt-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Tasks Pipeline
                        </div>
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin">
                          {project.tasks && project.tasks.length > 0 ? (
                            project.tasks.map((task) => {
                              const cfg = statusConfig[task.status];
                              const StatusIcon = cfg.icon;

                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-white/80 transition-colors group/task"
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
                            <span className="text-[10px] text-slate-400 italic pl-1">
                              No tasks in this project.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-4 mt-4 border-t border-amber-955/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-amber-600 group-hover:text-amber-700 flex items-center gap-1">
                        Open Board <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                      </span>

                      <Button
                        size="xs"
                        variant="outline"
                        className="border-amber-500/35 hover:bg-amber-500/10 text-amber-700 hover:text-amber-800 cursor-pointer text-[10px] font-bold px-2.5 py-1 rounded-lg"
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
        key={createTaskProjectId ? `${createTaskProjectId}-${newTaskStatus}` : "closed"}
        isOpen={!!createTaskProjectId}
        onClose={() => setCreateTaskProjectId(null)}
        projectName={
          projects.find((p) => p.id === createTaskProjectId)?.name || ""
        }
        isPending={isPending}
        initialStatus={newTaskStatus}
        members={members}
        currentUserId={currentUserId}
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
