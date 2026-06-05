"use client";

import React from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Circle,
  Clock,
  CheckCircle2,
  User,
} from "lucide-react";
import type { Project, Task, TaskStatus } from "@/types/workspace.types";

interface KanbanBoardProps {
  project: Project & { tasks: Task[] };
  isPending: boolean;
  onAddTask: (status: TaskStatus) => void;
  onDeleteProject: (id: string, name: string) => void;
  onDeleteTask: (id: string, title: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
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

function getUserInitials(name?: string | null, email?: string | null): string {
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

function getAvatarBgColor(identifier: string): string {
  const colors = [
    "bg-amber-500 text-white",     // Orange/yellow
    "bg-blue-500 text-white",      // Blue
    "bg-emerald-500 text-white",   // Green
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

export function KanbanBoard({
  project,
  isPending,
  onAddTask,
  onDeleteProject,
  onDeleteTask,
  onStatusChange,
}: KanbanBoardProps) {
  // Filter tasks into columns
  const todoTasks = project.tasks?.filter((t) => t.status === "todo") || [];
  const inProgressTasks = project.tasks?.filter((t) => t.status === "in_progress") || [];
  const doneTasks = project.tasks?.filter((t) => t.status === "done") || [];

  // Create a map from task.id to index for keying
  const sortedTasks = project.tasks
    ? [...project.tasks].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    : [];
  const taskNumberMap = new Map(sortedTasks.map((t, idx) => [t.id, idx + 1]));
  const projectPrefix = getProjectInitials(project.name);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
      {/* TO DO COLUMN */}
      <div className="rounded-2xl bg-slate-100/60 border border-slate-200/50 p-3.5 flex flex-col gap-3 min-h-[550px] w-full">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              To Do
            </h3>
            {todoTasks.length > 0 && (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {todoTasks.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[600px] pr-1">
          {todoTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_4px_rgba(15,23,42,0.01)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative"
            >
              <h4 className="text-xs font-semibold text-slate-800 leading-snug">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-[10px] text-slate-400 mt-1 leading-normal truncate">
                  {task.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                {/* Left: Task Key / Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-slate-100 text-slate-500 shrink-0">
                    <Circle size={10} />
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {projectPrefix}-{taskNumberMap.get(task.id)}
                  </span>
                </div>

                {/* Right: Actions + Assignee */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onStatusChange(task.id, "in_progress")}
                      className="p-1 rounded text-slate-400 hover:text-[#2d4a3e] hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Start task"
                    >
                      <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id, task.title)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0">
                    {task.assignee ? (
                      task.assignee.avatarUrl ? (
                        <img
                          src={task.assignee.avatarUrl}
                          alt={task.assignee.fullName || task.assignee.email}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border border-white shadow-sm uppercase ${getAvatarBgColor(
                            task.assignee.fullName || task.assignee.email
                          )}`}
                          title={task.assignee.fullName || task.assignee.email}
                        >
                          {getUserInitials(task.assignee.fullName, task.assignee.email)}
                        </div>
                      )
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm"
                        title="Unassigned"
                      >
                        <User size={10} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {todoTasks.length === 0 && (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
              <p className="text-[10px] text-slate-400">No tasks here</p>
            </div>
          )}
        </div>

        <button
          onClick={() => onAddTask("todo")}
          className="w-full flex items-center justify-start gap-1.5 px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Create</span>
        </button>
      </div>

      {/* IN PROGRESS COLUMN */}
      <div className="rounded-2xl bg-slate-100/60 border border-slate-200/50 p-3.5 flex flex-col gap-3 min-h-[550px] w-full">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              In Progress
            </h3>
            {inProgressTasks.length > 0 && (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {inProgressTasks.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[600px] pr-1">
          {inProgressTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_4px_rgba(15,23,42,0.01)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative"
            >
              <h4 className="text-xs font-semibold text-slate-800 leading-snug">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-[10px] text-slate-400 mt-1 leading-normal truncate">
                  {task.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                {/* Left: Task Key / Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-600 shrink-0">
                    <Clock size={10} />
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {projectPrefix}-{taskNumberMap.get(task.id)}
                  </span>
                </div>

                {/* Right: Actions + Assignee */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onStatusChange(task.id, "todo")}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Move back to To Do"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button
                      onClick={() => onStatusChange(task.id, "done")}
                      className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="Mark as Done"
                    >
                      <CheckCircle2 size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id, task.title)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0">
                    {task.assignee ? (
                      task.assignee.avatarUrl ? (
                        <img
                          src={task.assignee.avatarUrl}
                          alt={task.assignee.fullName || task.assignee.email}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border border-white shadow-sm uppercase ${getAvatarBgColor(
                            task.assignee.fullName || task.assignee.email
                          )}`}
                          title={task.assignee.fullName || task.assignee.email}
                        >
                          {getUserInitials(task.assignee.fullName, task.assignee.email)}
                        </div>
                      )
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm"
                        title="Unassigned"
                      >
                        <User size={10} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {inProgressTasks.length === 0 && (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
              <p className="text-[10px] text-slate-400">No tasks here</p>
            </div>
          )}
        </div>

        <button
          onClick={() => onAddTask("in_progress")}
          className="w-full flex items-center justify-start gap-1.5 px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Create</span>
        </button>
      </div>

      {/* DONE COLUMN */}
      <div className="rounded-2xl bg-slate-100/60 border border-slate-200/50 p-3.5 flex flex-col gap-3 min-h-[550px] w-full">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Done
            </h3>
            {doneTasks.length > 0 && (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {doneTasks.length}
              </span>
            )}
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
          </div>
        </div>

        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[600px] pr-1">
          {doneTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_4px_rgba(15,23,42,0.01)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative"
            >
              <h4 className="text-xs font-semibold text-slate-400 leading-snug line-through">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-[10px] text-slate-400 mt-1 leading-normal truncate line-through">
                  {task.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                {/* Left: Task Key / Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-emerald-50 text-emerald-600 shrink-0">
                    <CheckCircle2 size={10} />
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 line-through">
                    {projectPrefix}-{taskNumberMap.get(task.id)}
                  </span>
                </div>

                {/* Right: Actions + Assignee */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onStatusChange(task.id, "in_progress")}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Reopen task"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id, task.title)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0">
                    {task.assignee ? (
                      task.assignee.avatarUrl ? (
                        <img
                          src={task.assignee.avatarUrl}
                          alt={task.assignee.fullName || task.assignee.email}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border border-white shadow-sm uppercase ${getAvatarBgColor(
                            task.assignee.fullName || task.assignee.email
                          )}`}
                          title={task.assignee.fullName || task.assignee.email}
                        >
                          {getUserInitials(task.assignee.fullName, task.assignee.email)}
                        </div>
                      )
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm"
                        title="Unassigned"
                      >
                        <User size={10} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {doneTasks.length === 0 && (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
              <p className="text-[10px] text-slate-400">No tasks here</p>
            </div>
          )}
        </div>

        <button
          onClick={() => onAddTask("done")}
          className="w-full flex items-center justify-start gap-1.5 px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Create</span>
        </button>
      </div>
    </div>
  );
}
