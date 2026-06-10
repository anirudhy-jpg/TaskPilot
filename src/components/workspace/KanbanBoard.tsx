"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Circle,
  Clock,
  CheckCircle2,
  User,
  Calendar,
  ListTodo,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { Project, Task, TaskStatus, WorkspaceMember, TaskPriority } from "@/types/workspace.types";
import { AssigneeSelector } from "./AssigneeSelector";
import { TaskDetailsModal } from "./modals/TaskDetailsModal";

interface KanbanBoardProps {
  project: Project & { tasks: Task[] };
  members: WorkspaceMember[];
  currentUserId?: string;
  onAddTask: (status: TaskStatus) => void;
  onDeleteTask: (id: string, title: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
}

function getProjectInitials(name: string): string {
  if (!name) return "TASK";
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const words = cleanName.split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + (words[1] ? words[1][0] : "")).toUpperCase();
}

export function getUserInitials(name?: string | null, email?: string | null): string {
  const display = name || email || "?";
  if (display === "?") return "?";
  
  if (!name && email) {
    const parts = email.split("@")[0].split(/[\._-]/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  const parts = display.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function getAvatarBgColor(identifier: string): string {
  const colors = [
    "bg-amber-500 text-white",     // Orange/yellow
    "bg-blue-500 text-white",      // Blue
    "bg-zinc-700 text-white",      // Charcoal
    "bg-rose-500 text-white",      // Rose/red
    "bg-violet-500 text-white",    // Violet
    "bg-teal-500 text-white",      // Teal
    "bg-indigo-500 text-white",    // Indigo
    "bg-pink-500 text-white",      // Pink
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Deterministic visual priority assigner for UI presentation
export function getVisualPriority(task: Task): TaskPriority {
  if (task.priority && task.priority !== "medium") {
    return task.priority;
  }
  const titleLower = task.title.toLowerCase();
  if (titleLower.includes("bug") || titleLower.includes("fix") || titleLower.includes("critical") || titleLower.includes("urgent")) {
    return "high";
  }
  if (titleLower.includes("clean") || titleLower.includes("refactor") || titleLower.includes("doc") || titleLower.includes("test")) {
    return "low";
  }
  const charCode = task.id.charCodeAt(0) || 0;
  if (charCode % 3 === 0) return "high";
  if (charCode % 3 === 1) return "low";
  return "medium";
}

function formatTaskDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
}

export function KanbanBoard({
  project,
  members,
  currentUserId,
  onAddTask,
  onDeleteTask,
  onStatusChange,
  onAssigneeChange,
}: KanbanBoardProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = React.useMemo(() => {
    return project.tasks?.find((t) => t.id === selectedTaskId) || null;
  }, [project.tasks, selectedTaskId]);

  // Filter tasks into columns
  const todoTasks = React.useMemo(() => {
    return project.tasks?.filter((t) => t.status === "todo") || [];
  }, [project.tasks]);

  const inProgressTasks = React.useMemo(() => {
    return project.tasks?.filter((t) => t.status === "in_progress") || [];
  }, [project.tasks]);

  const doneTasks = React.useMemo(() => {
    return project.tasks?.filter((t) => t.status === "done") || [];
  }, [project.tasks]);

  // Create a map from task.id to index for keying
  const sortedTasks = React.useMemo(() => {
    return project.tasks
      ? [...project.tasks].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      : [];
  }, [project.tasks]);

  const taskNumberMap = React.useMemo(() => {
    return new Map(sortedTasks.map((t, idx) => [t.id, idx + 1]));
  }, [sortedTasks]);

  const projectPrefix = React.useMemo(() => {
    return getProjectInitials(project.name);
  }, [project.name]);

  // Helper to render columns
  const renderColumn = (
    title: string,
    status: TaskStatus,
    tasks: Task[],
    accentClass: string,
    headerIcon: React.ReactNode,
    badgeBg: string,
    nextStatus?: TaskStatus,
    prevStatus?: TaskStatus
  ) => {
    return (
      <div className={`rounded-3xl bg-white/40 backdrop-blur-md border border-amber-900/5 p-5 flex flex-col gap-4 min-h-[600px] w-full relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[4px] before:${accentClass} shadow-xs`}>
        {/* Column Header */}
        <div className="flex items-center justify-between px-1.5 mb-1.5">
          <div className="flex items-center gap-2.5">
            {headerIcon}
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {title}
            </h3>
            {tasks.length > 0 && (
              <span className={`text-[10px] ${badgeBg} px-2 py-0.5 rounded-full font-black shadow-2xs`}>
                {tasks.length}
              </span>
            )}
          </div>
        </div>

        {/* Task Cards Stack */}
        <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin">
          {tasks.map((task) => {
            const visualPriority = getVisualPriority(task);
            const priorityStyles = {
              high: {
                border: "border-l-[3.5px] border-l-rose-450",
                badge: "bg-rose-50 text-rose-600 border-rose-100/60 rounded-full",
                icon: <AlertCircle size={9} className="text-rose-500" />,
                label: "High"
              },
              medium: {
                border: "border-l-[3.5px] border-l-amber-450",
                badge: "bg-amber-50 text-amber-700 border-amber-200/40 rounded-full",
                icon: <AlertTriangle size={9} className="text-amber-600" />,
                label: "Medium"
              },
              low: {
                border: "border-l-[3.5px] border-l-slate-400",
                badge: "bg-slate-50 text-slate-650 border-slate-100 rounded-full",
                icon: <Info size={9} className="text-slate-400" />,
                label: "Low"
              }
            }[visualPriority];

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`p-5 bg-white/80 backdrop-blur-md hover:bg-white/95 rounded-2xl border border-amber-900/5 hover:border-amber-500/20 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.03)] hover:shadow-[0_16px_32px_-8px_rgba(245,158,11,0.1)] hover:-translate-y-1 transition-all duration-300 group relative cursor-pointer ${priorityStyles.border}`}
              >
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {projectPrefix}-{taskNumberMap.get(task.id)}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider shadow-3xs ${priorityStyles.badge}`}>
                    {priorityStyles.icon}
                    <span>{priorityStyles.label}</span>
                  </span>
                </div>

                {/* Task Title */}
                <h4 className={`text-xs sm:text-[13.5px] font-extrabold text-slate-800 leading-snug group-hover:text-amber-700 transition-colors ${status === "done" ? "line-through text-slate-400 font-medium" : ""}`}>
                  {task.title}
                </h4>

                {/* Task Description */}
                {task.description && (
                  <p className={`text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2 ${status === "done" ? "line-through text-slate-400" : ""}`}>
                    {task.description}
                  </p>
                )}

                <div className="h-[1px] bg-amber-955/10 my-3.5" />

                {/* Card Footer */}
                <div className="flex items-center justify-between">
                  {/* Left: Created Date */}
                  <div className="flex items-center gap-1 text-slate-400">
                    <Calendar size={11} className="text-slate-400" />
                    <span className="text-[10px] font-semibold">
                      {formatTaskDate(task.createdAt)}
                    </span>
                  </div>

                  {/* Right: Actions + Assignee */}
                  <div className="flex items-center gap-2 relative">
                    {/* Floating Hover Actions Toolbar */}
                    <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-amber-900/10 rounded-xl shadow-lg p-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 absolute right-8 bottom-[-2px] z-10">
                      {prevStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(task.id, prevStatus);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Move back"
                        >
                          <ArrowLeft size={11} />
                        </button>
                      )}
                      {nextStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(task.id, nextStatus);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-slate-55 transition-colors cursor-pointer"
                          title="Move forward"
                        >
                          <ArrowRight size={11} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id, task.title);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Avatar Selection wrapper */}
                    <div className="relative z-0">
                      <AssigneeSelector
                        task={task}
                        members={members}
                        currentUserId={currentUserId}
                        onChange={onAssigneeChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-amber-500/10 rounded-3xl bg-white/20 shadow-3xs p-4">
              <span className="text-xl mb-1.5 opacity-70">📥</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empty Column</p>
              <p className="text-[9px] text-slate-400/90 mt-0.5">No tasks in this stage</p>
            </div>
          )}
        </div>

        {/* Add Task Button at Bottom */}
        <button
          onClick={() => onAddTask(status)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-slate-650 hover:text-amber-700 bg-white/60 hover:bg-white border border-amber-900/5 hover:border-amber-500/20 rounded-2xl text-xs font-extrabold shadow-3xs hover:shadow-2xs transition-all duration-250 cursor-pointer"
        >
          <Plus size={13} className="text-amber-600 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
      {/* TO DO COLUMN */}
      {renderColumn(
        "To Do",
        "todo",
        todoTasks,
        "bg-gradient-to-r before:from-blue-400 before:to-indigo-500",
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 shadow-3xs shrink-0">
          <ListTodo size={12} />
        </span>,
        "bg-blue-50 text-blue-700 border border-blue-100/60",
        "in_progress",
        undefined
      )}

      {/* IN PROGRESS COLUMN */}
      {renderColumn(
        "In Progress",
        "in_progress",
        inProgressTasks,
        "bg-gradient-to-r before:from-amber-400 before:to-orange-500",
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50 border border-amber-250/50 text-amber-600 shadow-3xs shrink-0">
          <Clock size={12} className="animate-spin-slow" />
        </span>,
        "bg-amber-50 text-amber-700 border border-amber-250/60",
        "done",
        "todo"
      )}

      {/* DONE COLUMN */}
      {renderColumn(
        "Done",
        "done",
        doneTasks,
        "bg-gradient-to-r before:from-red-400 before:to-rose-500",
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-50 border border-rose-250/50 text-rose-600 shadow-3xs shrink-0">
          <CheckCircle2 size={12} />
        </span>,
        "bg-rose-50 text-rose-700 border border-rose-250/60",
        undefined,
        "in_progress"
      )}

      <TaskDetailsModal
        task={selectedTask}
        members={members}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        projectPrefix={projectPrefix}
        taskNumber={selectedTaskId ? taskNumberMap.get(selectedTaskId) : undefined}
        currentUserId={currentUserId}
        onAssigneeChange={onAssigneeChange}
      />
    </div>
  );
}
