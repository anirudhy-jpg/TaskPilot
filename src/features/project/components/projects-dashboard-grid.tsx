"use client";

import React from "react";
import { Plus, Trash2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, Task, TaskStatus } from "../types/project.types";
import { useRouter } from "next/navigation";

interface ProjectsDashboardGridProps {
  optimisticProjects: (Project & { tasks: Task[] })[];
  statusConfig: Record<
    TaskStatus,
    { label: string; color: string; icon: typeof Circle }
  >;
  cycleTaskStatus: (taskId: string, currentStatus: TaskStatus) => void;
  setDeleteTarget: (
    target: { type: "project" | "task"; id: string; name: string } | null
  ) => void;
  setNewTaskStatus: (status: TaskStatus) => void;
  setCreateTaskProjectId: (projectId: string | null) => void;
  setIsCreateProjectOpen: (open: boolean) => void;
  isWorkspaceMember?: boolean;
}

export function ProjectsDashboardGrid({
  optimisticProjects,
  statusConfig,
  cycleTaskStatus,
  setDeleteTarget,
  setNewTaskStatus,
  setCreateTaskProjectId,
  setIsCreateProjectOpen,
  isWorkspaceMember = false,
}: ProjectsDashboardGridProps) {
  const router = useRouter();

  if (optimisticProjects.length === 0) {
    return (
      <div className="p-12 rounded-xl bg-white border border-slate-200 text-center shadow-sm max-w-lg mx-auto mt-8">
        <div className="text-4xl mb-4">📂</div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          No Projects Yet
        </h3>
        <p className="text-xs text-slate-550 mb-4 leading-relaxed">
          {isWorkspaceMember
            ? "No projects have been created in this workspace yet. Contact your workspace owner to create one."
            : "Create a project to start planning workloads and managing pipelines."}
        </p>
        {!isWorkspaceMember && (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-slate-955 font-bold cursor-pointer"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            Create Your First Project
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {optimisticProjects.map((project) => {
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
            onClick={() => router.push(`/projects/${project.id}`)}
            className="bg-white/70 backdrop-blur-md border border-amber-900/5 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.03)] hover:shadow-[0_16px_32px_-8px_rgba(245,158,11,0.1)] hover:-translate-y-1 hover:border-amber-500/20 transition-all duration-305 flex flex-col justify-between min-h-[380px] group cursor-pointer"
          >
            {/* Card Top Details */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 uppercase tracking-wider">
                    {project.name.slice(0, 2).toUpperCase()}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-amber-700 transition-colors">
                    {project.name}
                  </h3>
                </div>
                {/* Delete Project Button */}
                {!isWorkspaceMember && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({
                        type: "project",
                        id: project.id,
                        name: project.name,
                      });
                    }}
                    className="p-1 rounded-lg text-slate-355 hover:text-red-505 hover:bg-red-55/10 border border-transparent hover:border-red-100 transition-all cursor-pointer"
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {project.description && (
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                  {project.description}
                </p>
              )}

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                  <span>{progressPercent}% Done</span>
                  <span className="text-slate-400">
                    {completedTasks}/{totalTasks} Tasks
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Task list preview inside project card */}
              <div className="pt-3 border-t border-amber-955/5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Recent Tasks
                </h4>
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
                            className="text-slate-350 hover:text-red-505 opacity-0 group-hover/task:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-slate-450 italic pl-1">
                      No tasks in this project.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="pt-4 mt-4 border-t border-amber-955/10 flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-amber-600 group-hover:text-amber-700 flex items-center gap-1">
                Open Board{" "}
                <span className="group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
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
  );
}
