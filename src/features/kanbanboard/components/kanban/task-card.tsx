"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { AssigneeSelector } from "@/features/tasks/components/assignee-selector";
import { getVisualPriority } from "@/features/project/utils/avatar";
import type { TaskCardProps } from "./types";


/**
 * Individual task card component for the Kanban board.
 */
export const TaskCard = React.memo(
  function TaskCard({
    task,
    // Removed _status
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
        border: "border-l-[3.5px] border-l-rose-500",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/20 rounded-full",
        icon: <AlertCircle size={9} className="text-rose-450" />,
        label: "High",
      },
      medium: {
        border: "border-l-[3.5px] border-l-amber-500",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20 rounded-full",
        icon: <AlertTriangle size={9} className="text-amber-500" />,
        label: "Medium",
      },
      low: {
        border: "border-l-[3.5px] border-l-slate-700",
        badge: "bg-slate-800 text-slate-400 border-slate-700/80 rounded-full",
        icon: <Info size={9} className="text-slate-500" />,
        label: "Low",
      },
    }[visualPriority];

    const typeStyles = {
      task: {
        badge: "bg-slate-500/10 text-slate-400 border-slate-500/20 rounded-full",
        icon: "📋",
        label: "Task",
      },
      feature: {
        badge: "bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-full",
        icon: "🚀",
        label: "Feature",
      },
      bug: {
        badge: "bg-red-500/10 text-red-400 border-red-500/20 rounded-full",
        icon: "🐛",
        label: "Bug",
      },
      enhancement: {
        badge: "bg-purple-500/10 text-purple-400 border-purple-500/20 rounded-full",
        icon: "✨",
        label: "Enhancement",
      },
    }[task.type || "task"];

    return (
      <div
        onClick={() => onSelectTask(task.id)}
        className={`bg-slate-900 border border-slate-800/80 rounded-2.5xl p-4 flex flex-col gap-3 shadow-3xs cursor-pointer select-none relative overflow-hidden transition-all duration-300 ${priorityStyles.border} ${
          isDragOverlay
            ? "shadow-lg border-amber-500/30 ring-2 ring-amber-500/10 scale-[1.02]"
            : disableHover
            ? ""
            : "hover:shadow-2xs hover:border-slate-700 hover:scale-[1.01]"
        }`}
      >
        {/* Title and ID */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
              {projectPrefix}-{taskNumber || "???"}
            </span>
            <h4 className="text-xs font-bold text-slate-200 leading-snug mt-1 hover:text-amber-400 transition-colors break-all line-clamp-2">
              {task.title}
            </h4>
          </div>
        </div>

        {/* Description Snippet */}
        {task.description && (
          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-slate-800/80 my-0.5" />

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

            {/* Type Badge */}
            <span
              className={`inline-flex items-center justify-center text-[10px] w-5 h-5 border ${typeStyles.badge}`}
              title={typeStyles.label}
            >
              <span>{typeStyles.icon}</span>
            </span>

            {/* Subtasks Indicator */}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full" title={`${task.subtasks.filter((st: { completed: boolean; status: string }) => st.completed || st.status === 'done').length}/${task.subtasks.length} Subtasks completed`}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v18"/><path d="M18 3v18"/><path d="M3 15h18"/><path d="M3 9h18"/></svg>
                {task.subtasks.filter((st: { completed: boolean; status: string }) => st.completed || st.status === 'done').length}/{task.subtasks.length}
              </span>
            )}
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
      prevProps.task.type === nextProps.task.type &&
      prevProps.task.assigneeId === nextProps.task.assigneeId &&
      prevProps.disableHover === nextProps.disableHover &&
      prevProps.taskNumber === nextProps.taskNumber &&
      prevProps.isDragOverlay === nextProps.isDragOverlay &&
      prevProps.members === nextProps.members &&
      JSON.stringify(prevProps.task.subtasks) === JSON.stringify(nextProps.task.subtasks)
    );
  }
);
