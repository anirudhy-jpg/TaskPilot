"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Circle, Clock, CheckCircle2, Calendar, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Task, Column, TaskPriority } from "@/features/project/types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { getVisualPriority } from "@/features/project/utils/avatar";
import { AssigneeSelector } from "../assignee-selector";
import { Select } from "@/components/ui/select";
import { TaskTimeline } from "../timeline/task-timeline";
import { TaskSubtasks } from "./task-subtasks";

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
  todo: { label: "To Do", color: "text-slate-300 bg-slate-950 border-slate-800", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
  done: { label: "Done", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", icon: CheckCircle2 },
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
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
      setEditedTitle(task.title || ""); // eslint-disable-line react-hooks/set-state-in-effect
      setEditedDesc(task.description || "");
      setIsEditingDesc(false);
      setIsEditingTitle(false);
    }
  }, [task]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditingTitle) {
          setEditedTitle(task?.title || "");
          setIsEditingTitle(false);
        } else if (isEditingDesc) {
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
  }, [isOpen, handleCancel, isEditingTitle, isEditingDesc, task?.title, task?.description]);

  if (!isOpen || !task) return null;

  const status = task.columnId || task.status || "todo";
  const activeCol = columns.find((c) => c.id === status);
  const statusLabel = activeCol ? activeCol.name : (statusConfig[status as keyof typeof statusConfig]?.label || "Unknown");
  const statusColor = statusConfig[status as keyof typeof statusConfig]?.color || "text-slate-300 bg-slate-950 border-slate-800";
  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Circle;
  const taskKey = `${projectPrefix}-${taskNumber || 1}`;

  const visualPriority = getVisualPriority(task);
  const priorityStyles = {
    high: {
      border: "border-l-[4px] border-l-rose-500",
      badge: "bg-rose-500/10 text-rose-450 border-rose-500/20",
      icon: <AlertCircle size={10} className="text-rose-400" />,
      label: "High"
    },
    medium: {
      border: "border-l-[4px] border-l-amber-500",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: <AlertTriangle size={10} className="text-amber-400" />,
      label: "Medium"
    },
    low: {
      border: "border-l-[4px] border-l-slate-655",
      badge: "bg-slate-500/10 text-slate-400 border-slate-850",
      icon: <Info size={10} className="text-slate-500" />,
      label: "Low"
    }
  }[visualPriority];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-955/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={handleCancel}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-5xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col md:flex-row h-[85vh] animate-in fade-in zoom-in-95 duration-200 z-10 ${priorityStyles.border}`}
      >
        {/* Left Column: Task Details */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-6 md:border-r border-slate-800">
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
              {onUpdateTask && isEditingTitle ? (
                <div className="flex flex-col gap-2 mt-1 w-full">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (editedTitle.trim() && editedTitle.trim() !== task.title) {
                          onUpdateTask(task.id, { title: editedTitle.trim() });
                        }
                        setIsEditingTitle(false);
                      } else if (e.key === "Escape") {
                        setEditedTitle(task.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-900 focus:bg-slate-950 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25 rounded-lg px-3 py-1.5 text-xl font-extrabold text-slate-200 leading-snug outline-none shadow-3xs transition-all duration-150"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (editedTitle.trim() && editedTitle.trim() !== task.title) {
                          onUpdateTask(task.id, { title: editedTitle.trim() });
                        } else {
                          setEditedTitle(task.title);
                        }
                        setIsEditingTitle(false);
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditedTitle(task.title);
                        setIsEditingTitle(false);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group relative w-full">
                  <h2 
                    onClick={() => onUpdateTask && setIsEditingTitle(true)}
                    className={`text-xl font-extrabold text-slate-200 leading-snug break-words ${onUpdateTask ? "cursor-pointer hover:bg-slate-800/50 rounded-lg px-2 -mx-2 py-1 border border-transparent hover:border-slate-800 transition-colors" : ""}`}
                  >
                    {task.title}
                  </h2>
                  {onUpdateTask && (
                    <button 
                      onClick={() => setIsEditingTitle(true)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all cursor-pointer shrink-0"
                      title="Edit title"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Mobile close button (visible only on small screens) */}
            <button
              onClick={handleCancel}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-all cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={15} />
            </button>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-slate-800 my-5" />

          {/* Content */}
          <div className="flex flex-col gap-5 flex-1 min-h-0">
            {/* Properties Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
              {/* Left Column */}
              <div className="flex flex-col gap-4">
                {/* Status Field */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</span>
                  {onStatusChange ? (
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
                  ) : (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider shadow-2xs w-fit ${statusColor}`}>
                      <StatusIcon size={12} />
                      <span>{statusLabel}</span>
                    </div>
                  )}
                </div>

                {/* Priority Field */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Priority</span>
                  {onUpdateTask ? (
                    <Select
                      value={task.priority || "medium"}
                      onChange={(val) => onUpdateTask(task.id, { priority: val as TaskPriority })}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                    />
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2 py-1.5 rounded border uppercase tracking-wider w-fit ${priorityStyles.badge}`}>
                      {priorityStyles.icon}
                      <span>{priorityStyles.label} Priority</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-4">
                {/* Assignee Field */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Assignee</span>
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
                      <span className="text-[11px] font-extrabold text-slate-300 truncate">
                        {task.assignee ? (task.assignee.fullName || "Name not set") : "Unassigned"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date Created */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Created At</span>
                  <div className="flex items-center gap-2 text-slate-400 h-[38px]">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-[11px] font-bold">
                      {new Date(task.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2 mt-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Description</span>
                {onUpdateTask && !isEditingDesc && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer"
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
                    rows={6}
                    className="w-full text-[11.5px] text-slate-200 bg-slate-955 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 resize-none leading-relaxed shadow-3xs"
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
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => onUpdateTask && setIsEditingDesc(true)}
                  className={`bg-slate-950 border border-slate-850 rounded-xl p-4 min-h-[120px] shadow-3xs group relative ${onUpdateTask ? "cursor-pointer hover:border-slate-800 hover:bg-slate-900/40 transition-all" : ""}`}
                >
                  {task.description ? (
                    <p className="text-[11.5px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-slate-500 italic">
                      No description provided for this task.
                    </p>
                  )}
                  {onUpdateTask && (
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/[0.01] rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                      <span className="text-[10px] font-black text-slate-450 bg-slate-950 border border-slate-800 shadow-2xs px-2.5 py-1 rounded-lg">
                        Click to edit
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Subtasks */}
            <div className="flex-1 min-h-0 flex flex-col">
              <TaskSubtasks 
                taskId={task.id} 
                members={members}
                projectPrefix={projectPrefix}
                parentTaskNumber={taskNumber || 1}
              />
            </div>
          </div>

          {/* Spacer */}
          <div className="shrink-0 h-4" />

          {/* Footer actions for Task Details */}
          <div className="shrink-0 flex justify-between items-center mt-auto pt-4 border-t border-slate-800">
            {onDeleteTask ? (
              <button
                onClick={() => {
                  onDeleteTask(task.id, task.title);
                  onClose();
                }}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-xl text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-[0.98]"
              >
                Delete Task
              </button>
            ) : (
              <div></div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Comments */}
        <div className="w-full md:w-[400px] flex flex-col bg-slate-900/50 rounded-r-2xl overflow-hidden relative">
          {/* Desktop close button */}
          <button
            onClick={handleCancel}
            className="hidden md:flex absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-all cursor-pointer z-20 shadow-sm"
            title="Close modal"
          >
            <X size={15} />
          </button>
          
          <div className="px-4 py-5 border-b border-slate-800 bg-slate-900 shrink-0">
            <h3 className="text-[13px] font-black text-slate-200 tracking-wide uppercase">Activity & Comments</h3>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <TaskTimeline 
              taskId={task.id} 
              currentUserId={currentUserId} 
              members={members} 
              columns={columns}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
