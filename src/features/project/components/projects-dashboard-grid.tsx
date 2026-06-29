"use client";

import React from "react";
import { Trash2, Circle, MoreVertical, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, Task, Column } from "../types/project.types";
import { useRouter } from "next/navigation";
import { usePin } from "@/features/pins/hooks/use-pin";
import { Pin, PinOff } from "lucide-react";

interface ProjectsDashboardGridProps {
  optimisticProjects: (Project & { tasks: Task[]; columns?: Column[] })[];
  statusConfig: Record<
    string,
    { label: string; color: string; icon: typeof Circle }
  >;
  cycleTaskStatus: (taskId: string, currentStatus: string) => void;
  setDeleteTarget: (
    target: { type: "project" | "task"; id: string; name: string } | null
  ) => void;
  setNewTaskStatus: (status: string) => void;
  setCreateTaskProjectId: (projectId: string | null) => void;
  setIsCreateProjectOpen: (open: boolean) => void;
  isWorkspaceMember?: boolean;
  onEditProject: (project: Project) => void;
}

// Project Card Component to manage its own optimistic state for the pin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectCard({ project, isWorkspaceMember, activeMenuId, setActiveMenuId, onEditProject, setDeleteTarget, progressPercent, completedTasks, totalTasks, statusConfig, cycleTaskStatus }: any) {
  const router = useRouter();
  const { isPinned, togglePin } = usePin({
    entityType: "project",
    entityId: project.id,
    initialIsPinned: !!project.isPinned,
  });

  return (
          <div
            onClick={() => router.push(`/projects/${project.id}`)}
            className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:bg-slate-900/80 hover:-translate-y-1 hover:border-amber-500/25 transition-all duration-300 flex flex-col h-full min-h-[220px] group cursor-pointer"
          >
            {/* Card Top Details */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                    {project.name.slice(0, 2).toUpperCase()}
                  </span>
                  <h3 className="text-sm font-bold text-slate-200 truncate group-hover:text-amber-450 transition-colors flex items-center gap-1.5">
                    {isPinned && <Pin size={12} className="text-amber-500 shrink-0 fill-amber-500/20" />}
                    {project.name}
                  </h3>
                </div>
                {/* Options Menu */}
                <div className="relative project-card-menu flex items-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === project.id ? null : project.id);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-800"
                    title="Project Options"
                  >
                    <MoreVertical size={13} />
                  </button>
                  {activeMenuId === project.id && (
                    <div className="absolute right-0 mt-1 top-6 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin();
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-2.5 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-2 border-b border-slate-800"
                      >
                        {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                        {isPinned ? "Unpin" : "Pin"}
                      </button>
                      {!isWorkspaceMember && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProject(project);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-2.5 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Edit2 size={12} />
                            Edit details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({
                                type: "project",
                                id: project.id,
                                name: project.name,
                              });
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-2.5 text-left text-xs font-semibold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed height description to ensure uniform card sizing */}
              <div className="mb-4 h-[36px]">
                {project.description ? (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                ) : null}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                  <span>{progressPercent}% Done</span>
                  <span className="text-slate-500">
                    {completedTasks}/{totalTasks} Tasks
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-955 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Task list preview inside project card */}
              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Recent Tasks
                </h4>
                <div className="space-y-1.5 h-[80px] overflow-y-auto pr-1 scrollbar-thin">
                  {project.tasks && project.tasks.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    project.tasks.map((task: any) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const activeCol = project.columns?.find((c: any) => c.id === task.columnId || c.id === task.status);
                      const cfg = statusConfig[task.columnId] || {
                        label: activeCol ? activeCol.name : "To Do",
                        color: "text-[#9bb0a5]",
                        icon: Circle,
                      };
                      const StatusIcon = cfg.icon;

                      const isDone = task.columnId === "done" || task.status === "done" || (activeCol && (activeCol.name.toLowerCase().includes("done") || activeCol.name.toLowerCase().includes("complete") || activeCol.name.toLowerCase().includes("finish")));

                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-slate-950/60 transition-colors group/task"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  cycleTaskStatus(task.id, task.columnId);
                              }}
                              className={`${cfg.color} hover:opacity-80 transition-opacity cursor-pointer shrink-0`}
                              title={`Status: ${cfg.label}. Click to cycle.`}
                            >
                              <StatusIcon size={12} />
                            </button>
                            <span
                              className={`text-[11px] truncate ${
                                isDone
                                  ? "line-through text-slate-500"
                                  : "text-slate-300 font-medium"
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
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover/task:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-slate-500 italic pl-1">
                      No tasks in this project.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="pt-4 mt-auto border-t border-slate-800/80 flex items-center justify-center gap-2">
              <span className="text-[11px] font-extrabold text-amber-500 group-hover:text-amber-400 flex items-center gap-1">
                Open Board{" "}
                <span className="group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </span>
            </div>
          </div>
  );
}


export function ProjectsDashboardGrid({
  optimisticProjects,
  statusConfig,
  cycleTaskStatus,
  setDeleteTarget,
  // Removed setNewTaskStatus and setCreateTaskProjectId
  setIsCreateProjectOpen,
  isWorkspaceMember = false,
  onEditProject,
}: ProjectsDashboardGridProps) {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeMenuId && !(event.target as Element).closest(".project-card-menu")) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  if (optimisticProjects.length === 0) {
    return (
      <div className="p-12 rounded-xl bg-slate-900 border border-slate-800 text-center shadow-md max-w-lg mx-auto mt-8">
        <div className="text-4xl mb-4">📂</div>
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          No Projects Yet
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {isWorkspaceMember
            ? "No projects have been created in this workspace yet. Contact your workspace owner to create one."
            : "Create a project to start planning workloads and managing pipelines."}
        </p>
        {!isWorkspaceMember && (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold cursor-pointer"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            Create Your First Project
          </Button>
        )}
      </div>
    );
  }

  const renderProjectGrid = (projects: (Project & { tasks: Task[]; columns?: Column[] })[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project) => {
        const totalTasks = project.tasks?.length || 0;
        const completedTasks =
          project.tasks?.filter((t) => {
            if (t.columnId === "done" || t.status === "done") return true;
            const col = project.columns?.find((c) => c.id === t.columnId || c.id === t.status);
            if (!col) return false;
            const colName = col.name.toLowerCase();
            return colName.includes("done") || colName.includes("complete") || colName.includes("finish");
          }).length || 0;
        const progressPercent =
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;

        return (
          <ProjectCard 
            key={project.id}
            project={project}
            isWorkspaceMember={isWorkspaceMember}
            activeMenuId={activeMenuId}
            setActiveMenuId={setActiveMenuId}
            onEditProject={onEditProject}
            setDeleteTarget={setDeleteTarget}
            progressPercent={progressPercent}
            completedTasks={completedTasks}
            totalTasks={totalTasks}
            statusConfig={statusConfig}
            cycleTaskStatus={cycleTaskStatus}
          />
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      {renderProjectGrid(optimisticProjects)}
    </div>
  );
}
