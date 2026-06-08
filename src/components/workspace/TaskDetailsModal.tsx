"use client";

import React, { useEffect, useRef } from "react";
import { X, Circle, Clock, CheckCircle2, User, Calendar, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Task, WorkspaceMember } from "@/types/workspace.types";
import { getUserInitials, getAvatarBgColor, getVisualPriority } from "./KanbanBoard";
import { AssigneeSelector } from "./AssigneeSelector";

interface TaskDetailsModalProps {
  task: Task | null;
  members: WorkspaceMember[];
  isOpen: boolean;
  onClose: () => void;
  projectPrefix: string;
  taskNumber?: number;
  currentUserId?: string;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
}

const statusConfig = {
  todo: { label: "To Do", color: "text-blue-700 bg-blue-50 border-blue-100/60", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-700 bg-amber-50 border-amber-250/50", icon: Clock },
  done: { label: "Done", color: "text-rose-700 bg-rose-50 border-rose-250/50", icon: CheckCircle2 },
};

export function TaskDetailsModal({
  task,
  members,
  isOpen,
  onClose,
  projectPrefix,
  taskNumber,
  currentUserId,
  onAssigneeChange,
}: TaskDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const status = task.status || "todo";
  const { label: statusLabel, color: statusColor, icon: StatusIcon } = statusConfig[status];
  const taskKey = `${projectPrefix}-${taskNumber || 1}`;

  const visualPriority = getVisualPriority(task);
  const priorityStyles = {
    high: {
      border: "border-l-[4px] border-l-rose-500",
      badge: "bg-rose-50/80 text-rose-600 border-rose-100/60",
      icon: <AlertCircle size={10} className="text-rose-500" />,
      label: "High"
    },
    medium: {
      border: "border-l-[4px] border-l-amber-500",
      badge: "bg-amber-50/80 text-amber-600 border-amber-200/40",
      icon: <AlertTriangle size={10} className="text-amber-600" />,
      label: "Medium"
    },
    low: {
      border: "border-l-[4px] border-l-slate-400",
      badge: "bg-slate-50/80 text-slate-500 border-slate-100",
      icon: <Info size={10} className="text-slate-400" />,
      label: "Low"
    }
  }[visualPriority];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/60 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 z-10 ${priorityStyles.border}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                {taskKey}
              </span>
              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${priorityStyles.badge}`}>
                {priorityStyles.icon}
                <span>{priorityStyles.label} Priority</span>
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-800 leading-snug">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-slate-100" />

        {/* Content */}
        <div className="flex flex-col gap-4">
          {/* Status Field */}
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0 uppercase tracking-wider">Status</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-2xs ${statusColor}`}>
              <StatusIcon size={11} />
              <span>{statusLabel}</span>
            </div>
          </div>

          {/* Assignee Field */}
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0 uppercase tracking-wider">Assignee</span>
            <div className="flex items-center gap-3">
              <div className="relative z-0">
                <AssigneeSelector
                  task={task}
                  members={members}
                  currentUserId={currentUserId}
                  onChange={onAssigneeChange}
                  size="large"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-extrabold text-slate-700 truncate">
                  {task.assignee ? (task.assignee.fullName || "Name not set") : "Unassigned"}
                </span>
                {task.assignee?.email && (
                  <span className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                    {task.assignee.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Date Created */}
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0 uppercase tracking-wider">Created At</span>
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={12} className="text-slate-400" />
              <span className="text-[10px] font-bold">
                {new Date(task.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Description</span>
            <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3 min-h-[85px] shadow-3xs">
              {task.description ? (
                <p className="text-[11.5px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-[11.5px] text-slate-400 italic">
                  No description provided for this task.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
