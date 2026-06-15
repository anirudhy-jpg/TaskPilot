"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Circle, Clock, CheckCircle2, Calendar, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Task, Column, TaskPriority } from "@/features/project/types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { getVisualPriority } from "@/features/project/utils/avatar";
import { AssigneeSelector } from "../assignee-selector";
import { Select } from "@/components/ui/select";

interface TaskDetailsModalProps {
  task: Task | null;
  members: WorkspaceMember[];
  isOpen: boolean;
  onClose: () => void;
  projectPrefix: string;
  taskNumber?: number;
  currentUserId?: string;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onDeleteTask?: (taskId: string, title: string) => void;
  columns?: Column[];
  onUpdateTask?: (
    taskId: string,
    updates: { title?: string; description?: string | null; priority?: TaskPriority }
  ) => void;
}

const statusConfig = {
  todo: { label: "To Do", color: "text-blue-700 bg-blue-50 border-blue-100/60", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-700 bg-amber-50 border-amber-250/50", icon: Clock },
  done: { label: "Done", color: "text-rose-700 bg-rose-50 border-rose-255/50", icon: CheckCircle2 },
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
  onStatusChange,
  onDeleteTask,
  columns = [],
  onUpdateTask,
}: TaskDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const initialTaskRef = useRef<Task | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState("");

  // Capture initial state when modal opens
  useEffect(() => {
    if (isOpen && task && !initialTaskRef.current) {
      initialTaskRef.current = { ...task };
    }
    if (!isOpen) {
      initialTaskRef.current = null;
    }
  }, [isOpen, task]);

  // Sync state when task changes or modal opens
  useEffect(() => {
    if (task) {
      setEditedTitle(task.title || "");
      setEditedDesc(task.description || "");
      setIsEditingDesc(false);
    }
  }, [task?.id]);

  const handleCancel = useCallback(() => {
    const initial = initialTaskRef.current;
    if (initial && task) {
      // Revert title if modified
      if (onUpdateTask && task.title !== initial.title) {
        onUpdateTask(task.id, { title: initial.title });
      }
      // Revert priority if modified
      if (onUpdateTask && task.priority !== initial.priority) {
        onUpdateTask(task.id, { priority: initial.priority });
      }
      // Revert description if modified
      if (onUpdateTask && task.description !== initial.description) {
        onUpdateTask(task.id, { description: initial.description });
      }
      // Revert assignee if modified
      if (task.assigneeId !== initial.assigneeId) {
        onAssigneeChange(task.id, initial.assigneeId);
      }
      // Revert status if modified
      if (onStatusChange && (task.columnId !== initial.columnId || task.status !== initial.status)) {
        onStatusChange(task.id, initial.columnId || initial.status);
      }
    }
    onClose();
  }, [task, onClose, onUpdateTask, onAssigneeChange, onStatusChange]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditingDesc) {
          setEditedDesc(task?.description || "");
          setIsEditingDesc(false);
        } else {
          handleCancel();
        }
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleCancel, isEditingDesc, task?.description]);

  if (!isOpen || !task) return null;

  const status = task.columnId || task.status || "todo";
  const activeCol = columns.find((c) => c.id === status);
  const statusLabel = activeCol ? activeCol.name : (statusConfig[status as keyof typeof statusConfig]?.label || "Unknown");
  const statusColor = statusConfig[status as keyof typeof statusConfig]?.color || "text-slate-700 bg-slate-50 border-slate-200";
  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Circle;
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
        onClick={handleCancel}
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
            {onUpdateTask ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => {
                  if (editedTitle.trim() && editedTitle.trim() !== task.title) {
                    onUpdateTask(task.id, { title: editedTitle.trim() });
                  } else {
                    setEditedTitle(task.title);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    setEditedTitle(task.title);
                    e.currentTarget.blur();
                  }
                }}
                className="w-full bg-transparent border-0 hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/25 rounded-lg px-2 -mx-2 py-1 text-base font-extrabold text-slate-800 leading-snug outline-none cursor-pointer focus:cursor-text transition-all duration-150"
              />
            ) : (
              <h2 className="text-base font-extrabold text-slate-800 leading-snug">
                {task.title}
              </h2>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer shrink-0"
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
            {onStatusChange ? (
              <div className="w-36">
                <Select
                  value={status}
                  onChange={(val) => onStatusChange(task.id, val)}
                  options={columns.length > 0 ? columns.map((col) => ({
                    value: col.id,
                    label: col.name
                  })) : [
                    { value: "todo", label: "To Do" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "done", label: "Done" },
                  ]}
                />
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-2xs ${statusColor}`}>
                <StatusIcon size={11} />
                <span>{statusLabel}</span>
              </div>
            )}
          </div>

          {/* Priority Field */}
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0 uppercase tracking-wider">Priority</span>
            {onUpdateTask ? (
              <div className="w-36">
                <Select
                  value={task.priority || "medium"}
                  onChange={(val) => onUpdateTask(task.id, { priority: val as TaskPriority })}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${priorityStyles.badge}`}>
                {priorityStyles.icon}
                <span>{priorityStyles.label} Priority</span>
              </span>
            )}
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
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Description</span>
              {onUpdateTask && !isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingDesc ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  placeholder="Add a description for this task..."
                  rows={4}
                  className="w-full text-[11.5px] text-slate-700 bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 resize-none leading-relaxed shadow-3xs"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onUpdateTask) {
                        onUpdateTask(task.id, { description: editedDesc.trim() || null });
                      }
                      setIsEditingDesc(false);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditedDesc(task.description || "");
                      setIsEditingDesc(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => onUpdateTask && setIsEditingDesc(true)}
                className={`bg-slate-50/50 border border-slate-200/50 rounded-xl p-3 min-h-[85px] shadow-3xs group relative ${onUpdateTask ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/80 transition-all" : ""}`}
              >
                {task.description ? (
                  <p className="text-[11.5px] text-slate-650 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-[11.5px] text-slate-400 italic">
                    No description provided for this task.
                  </p>
                )}
                {onUpdateTask && (
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/[0.01] rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                    <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 shadow-2xs px-2.5 py-1 rounded-lg">
                      Click to edit
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-2">
          {onDeleteTask ? (
            <button
              onClick={() => {
                onDeleteTask(task.id, task.title);
                onClose();
              }}
              className="px-4 py-2 bg-rose-50/80 hover:bg-rose-100/80 text-rose-600 border border-rose-255/50 rounded-xl text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-[0.98]"
            >
              Delete Task
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onUpdateTask) {
                  if (editedTitle.trim() && editedTitle.trim() !== task.title) {
                    onUpdateTask(task.id, { title: editedTitle.trim() });
                  }
                  if (isEditingDesc) {
                    onUpdateTask(task.id, { description: editedDesc.trim() || null });
                  }
                }
                onClose();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-955 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/10 active:scale-[0.98]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
