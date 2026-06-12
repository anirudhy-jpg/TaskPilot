"use client";

import React from "react";
import {
  Calendar,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { AssigneeSelector } from "../assignee-selector";
import { getVisualPriority } from "../../utils/avatar";
import type { TaskCardProps } from "./types";

/**
 * Formats a date string to "Mon DD" format.
 */
function formatTaskDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Individual task card component for the Kanban board.
 */
export const TaskCard = React.memo(
  function TaskCard({
    task,
    status,
    members,
    currentUserId,
    projectPrefix,
    taskNumber,
    isDragOverlay = false,
    disableHover = false,
    onAssigneeChange,
    onSelectTask,
  }: TaskCardProps) {
    const visualPriority = getVisualPriority(task);
    const priorityStyles = {
      high: {
        border: "border-l-[3.5px] border-l-rose-450",
        badge: "bg-rose-50 text-rose-600 border-rose-100/60 rounded-full",
        icon: <AlertCircle size={9} className="text-rose-500" />,
        label: "High",
      },
      medium: {
        border: "border-l-[3.5px] border-l-amber-450",
        badge: "bg-amber-50 text-amber-700 border-amber-200/40 rounded-full",
        icon: <AlertTriangle size={9} className="text-amber-600" />,
        label: "Medium",
      },
      low: {
        border: "border-l-[3.5px] border-l-slate-350",
        badge: "bg-slate-50 text-slate-650 border-slate-200/50 rounded-full",
        icon: <Info size={9} className="text-slate-550" />,
        label: "Low",
      },
    }[visualPriority];

    return (
      <div
        onClick={() => onSelectTask(task.id)}
        className={`bg-white border border-amber-900/5 rounded-2.5xl p-4 flex flex-col gap-3 shadow-3xs cursor-pointer select-none relative overflow-hidden transition-all duration-300 ${priorityStyles.border} ${
          isDragOverlay
            ? "shadow-lg border-amber-500/30 ring-2 ring-amber-500/10 scale-[1.02]"
            : disableHover
            ? ""
            : "hover:shadow-2xs hover:border-amber-500/15 hover:scale-[1.01]"
        }`}
      >
        {/* Title and ID */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {projectPrefix}-{taskNumber || "???"}
            </span>
            <h4 className="text-xs font-bold text-slate-800 leading-snug mt-1 hover:text-amber-700 transition-colors">
              {task.title}
            </h4>
          </div>
        </div>

        {/* Description Snippet */}
        {task.description && (
          <p className="text-[10px] text-slate-450 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-slate-100/60 my-0.5" />

        {/* Footer info: Priority, Date, Assignee */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border ${priorityStyles.badge}`}
            >
              {priorityStyles.icon}
              {priorityStyles.label}
            </span>

            {/* Date Badge */}
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-full">
              <Calendar size={9} />
              {formatTaskDate(task.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.columnId === nextProps.task.columnId &&
      prevProps.task.position === nextProps.task.position &&
      prevProps.task.title === nextProps.task.title &&
      prevProps.task.description === nextProps.task.description &&
      prevProps.task.priority === nextProps.task.priority &&
      prevProps.task.assigneeId === nextProps.task.assigneeId &&
      prevProps.disableHover === nextProps.disableHover &&
      prevProps.taskNumber === nextProps.taskNumber &&
      prevProps.isDragOverlay === nextProps.isDragOverlay
    );
  }
);
