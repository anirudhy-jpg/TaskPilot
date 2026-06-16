"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { X, FolderKanban, Calendar, Clock, Circle, CheckCircle2, User, AlertCircle, AlertTriangle, Info, ListTodo } from "lucide-react"
import type { Project, Task, Column, TaskPriority } from "@/features/project/types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"
import { getProjectTasksAction } from "@/features/project/actions/get-project-tasks.action"

interface TeamDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  members: WorkspaceMember[]
}

const defaultStatusConfig = {
  todo: { label: "To Do", color: "text-slate-300 bg-slate-950 border-slate-800", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
  done: { label: "Done", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", icon: CheckCircle2 },
}

export function TeamDetailsModal({ isOpen, onClose, project, members }: TeamDetailsModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("all")

  // Fetch project tasks & columns on mount/open
  useEffect(() => {
    if (isOpen && project?.id) {
      setIsLoading(true)
      setError(null)
      setActiveTab("all")
      getProjectTasksAction(project.id)
        .then((res) => {
          if (res.success) {
            setTasks(res.tasks || [])
            setColumns(res.columns || [])
          } else {
            setError(res.error || "Failed to load project tasks.")
          }
        })
        .catch((err) => {
          console.error("Error fetching tasks for team card:", err)
          setError("An unexpected error occurred while loading tasks.")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen, project?.id])

  // Keydown listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !project) return null

  // Map of column ID to Column name
  const columnNameMap = new Map<string, string>()
  columns.forEach((col) => {
    columnNameMap.set(col.id, col.name)
  })

  // Filter tasks based on the active tab
  const filteredTasks = activeTab === "all" ? tasks : tasks.filter((t) => t.columnId === activeTab)

  // Status Badge styles for Project Status
  const projectStatusStyles = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    archived: "bg-slate-800 text-slate-400 border-slate-700",
  }[project.status || "active"]

  const getPriorityStyle = (priority: TaskPriority) => {
    return {
      high: {
        border: "border-l-[3.5px] border-l-rose-500",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        icon: <AlertCircle size={10} className="text-rose-400" />,
        label: "High",
      },
      medium: {
        border: "border-l-[3.5px] border-l-amber-500",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        icon: <AlertTriangle size={10} className="text-amber-400" />,
        label: "Medium",
      },
      low: {
        border: "border-l-[3.5px] border-l-slate-600",
        badge: "bg-slate-500/10 text-slate-400 border-slate-850",
        icon: <Info size={10} className="text-slate-500" />,
        label: "Low",
      },
    }[priority || "medium"]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-4xl w-full h-[560px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-10">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/15">
              <FolderKanban size={20} className="text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-100 leading-snug">
                  {project.name}
                </h3>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${projectStatusStyles}`}>
                  {project.status || "active"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {project.description || "No description provided for this project."}
              </p>
              <div className="flex items-center gap-4 mt-2.5 text-[10px] text-slate-500 font-bold">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Created {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                </div>
                {project.creatorName && (
                  <div>
                    <span>by </span>
                    <span className="text-slate-400">{project.creatorName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-all cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden flex-1 min-h-0">
          
          {/* Left panel: Tasks listing (60% width) */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 min-h-0 bg-slate-900">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ListTodo size={16} className="text-slate-400" />
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Project Tasks</span>
                <span className="text-[10px] font-black px-1.5 py-0.25 bg-slate-950 border border-slate-850 rounded-full text-slate-400">
                  {tasks.length}
                </span>
              </div>
            </div>

            {/* Column Tabs */}
            {columns.length > 0 && (
              <div className="flex items-center gap-1 pb-1 overflow-x-auto border-b border-slate-800 shrink-0 select-none">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "all"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent"
                  }`}
                >
                  All Tasks ({tasks.length})
                </button>
                {columns.map((col) => {
                  const colTasksCount = tasks.filter((t) => t.columnId === col.id).length
                  return (
                    <button
                      key={col.id}
                      onClick={() => setActiveTab(col.id)}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === col.id
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent"
                      }`}
                    >
                      {col.name} ({colTasksCount})
                    </button>
                  )
                })}
              </div>
            )}

            {/* Dynamic Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {isLoading ? (
                // Skeletons
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col gap-2.5 animate-pulse"
                    >
                      <div className="h-4 bg-slate-800 rounded-lg w-2/3" />
                      <div className="h-3 bg-slate-800 rounded-lg w-1/2" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-medium text-center">
                  {error}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-slate-950 border border-dashed border-slate-850">
                  <div className="text-2xl mb-2">📋</div>
                  <p className="text-xs text-slate-400 font-bold">No tasks found</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {activeTab === "all"
                      ? "There are no tasks defined in this project."
                      : `No tasks are currently in "${columnNameMap.get(activeTab) || "this status"}".`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTasks.map((task) => {
                    const priorityStyle = getPriorityStyle(task.priority)
                    const statusName = columnNameMap.get(task.columnId) || task.status
                    const fallbackConfig = defaultStatusConfig[task.status as keyof typeof defaultStatusConfig]
                    const statusLabel = statusName ? statusName : (fallbackConfig?.label || "Unknown")
                    const statusColor = fallbackConfig?.color || "text-slate-300 bg-slate-950 border-slate-800"

                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-xl border border-slate-850 bg-slate-950 hover:bg-slate-900/60 hover:border-slate-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all flex flex-col gap-2.5 ${priorityStyle.border}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-xs font-bold text-slate-200 leading-snug">
                            {task.title}
                          </h4>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${priorityStyle.badge}`}>
                            {priorityStyle.icon}
                            <span>{priorityStyle.label}</span>
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 mt-0.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>

                          <div className="flex items-center gap-2">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-[9px] font-black uppercase shrink-0">
                                  {task.assignee.fullName?.[0] || task.assignee.email?.[0] || "?"}
                                </div>
                                <span className="text-[9.5px] font-bold text-slate-400 max-w-[100px] truncate">
                                  {task.assignee.fullName || "Name not set"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-500 italic font-semibold">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Team Members list (40% width) */}
          <div className="w-full lg:max-w-xs xl:max-w-sm p-6 overflow-y-auto flex flex-col gap-4 shrink-0 bg-slate-900">
            <div className="flex items-center gap-2 shrink-0">
              <User size={16} className="text-slate-400" />
              <span className="text-xs font-black text-slate-350 uppercase tracking-wider">
                Team Members ({members.length})
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {members.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs italic">
                  No members assigned to this project yet.
                </div>
              ) : (
                members.map((member) => {
                  const memberTasksCount = tasks.filter((t) => t.assigneeId === member.userId).length

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-700 transition-all shadow-3xs"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs font-extrabold uppercase shrink-0">
                        {member.profile?.fullName?.[0] || member.profile?.email?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {member.profile?.fullName || "Unknown"}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate mt-0.5">
                          {member.profile?.email || member.userId}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-bold capitalize">
                          {member.role}
                        </span>
                        {memberTasksCount > 0 && (
                          <span
                            title={`${memberTasksCount} tasks assigned`}
                            className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full shrink-0"
                          >
                            {memberTasksCount} task{memberTasksCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <Link
            href={`/projects/${project.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98]"
          >
            <FolderKanban size={14} />
            <span>Open Project Board</span>
          </Link>

          <button
            onClick={onClose}
            className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-[0.98]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
