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
  todo: { label: "To Do", color: "text-blue-700 bg-blue-50 border-blue-100/60", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-700 bg-amber-50 border-amber-250/50", icon: Clock },
  done: { label: "Done", color: "text-rose-700 bg-rose-50 border-rose-255/50", icon: CheckCircle2 },
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
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    completed: "bg-blue-50 text-blue-700 border-blue-100",
    archived: "bg-slate-50 text-slate-600 border-slate-200",
  }[project.status || "active"]

  const getPriorityStyle = (priority: TaskPriority) => {
    return {
      high: {
        border: "border-l-[3.5px] border-l-rose-500",
        badge: "bg-rose-50/80 text-rose-600 border-rose-100/60",
        icon: <AlertCircle size={10} className="text-rose-500" />,
        label: "High",
      },
      medium: {
        border: "border-l-[3.5px] border-l-amber-500",
        badge: "bg-amber-50/80 text-amber-600 border-amber-200/40",
        icon: <AlertTriangle size={10} className="text-amber-600" />,
        label: "Medium",
      },
      low: {
        border: "border-l-[3.5px] border-l-slate-400",
        badge: "bg-slate-50/80 text-slate-500 border-slate-100",
        icon: <Info size={10} className="text-slate-400" />,
        label: "Low",
      },
    }[priority || "medium"]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-4xl w-full h-[560px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-10">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/30">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/10">
              <FolderKanban size={20} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                  {project.name}
                </h3>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${projectStatusStyles}`}>
                  {project.status || "active"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {project.description || "No description provided for this project."}
              </p>
              <div className="flex items-center gap-4 mt-2.5 text-[10px] text-slate-400 font-bold">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Created {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                </div>
                {project.creatorName && (
                  <div>
                    <span>by </span>
                    <span className="text-slate-500">{project.creatorName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-150 overflow-hidden flex-1 min-h-0">
          
          {/* Left panel: Tasks listing (60% width) */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ListTodo size={16} className="text-slate-500" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Project Tasks</span>
                <span className="text-[10px] font-black px-1.5 py-0.25 bg-slate-100 border border-slate-200 rounded-full text-slate-600">
                  {tasks.length}
                </span>
              </div>
            </div>

            {/* Column Tabs */}
            {columns.length > 0 && (
              <div className="flex items-center gap-1 pb-1 overflow-x-auto border-b border-slate-100 shrink-0 select-none">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                    activeTab === "all"
                      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent"
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
                          ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent"
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
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2.5 animate-pulse"
                    >
                      <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
                      <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-600 font-medium text-center">
                  {error}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-slate-50/40 border border-dashed border-slate-200">
                  <div className="text-2xl mb-2">📋</div>
                  <p className="text-xs text-slate-500 font-bold">No tasks found</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
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
                    const statusColor = fallbackConfig?.color || "text-slate-600 bg-slate-50 border-slate-200"

                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-xl border border-slate-100/90 bg-slate-50/40 hover:bg-white hover:border-slate-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition-all flex flex-col gap-2.5 ${priorityStyle.border}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-xs font-bold text-slate-800 leading-snug">
                            {task.title}
                          </h4>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${priorityStyle.badge}`}>
                            {priorityStyle.icon}
                            <span>{priorityStyle.label}</span>
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100/50 mt-0.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>

                          <div className="flex items-center gap-2">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700 text-[9px] font-black uppercase shrink-0">
                                  {task.assignee.fullName?.[0] || task.assignee.email?.[0] || "?"}
                                </div>
                                <span className="text-[9.5px] font-bold text-slate-600 max-w-[100px] truncate">
                                  {task.assignee.fullName || "Name not set"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-400 italic font-semibold">Unassigned</span>
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
          <div className="w-full lg:max-w-xs xl:max-w-sm p-6 overflow-y-auto flex flex-col gap-4 shrink-0 bg-slate-50/15">
            <div className="flex items-center gap-2 shrink-0">
              <User size={16} className="text-slate-500" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Team Members ({members.length})
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {members.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  No members assigned to this project yet.
                </div>
              ) : (
                members.map((member) => {
                  const memberTasksCount = tasks.filter((t) => t.assigneeId === member.userId).length

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-3xs"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700 text-xs font-extrabold uppercase shrink-0">
                        {member.profile?.fullName?.[0] || member.profile?.email?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {member.profile?.fullName || "Unknown"}
                        </p>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">
                          {member.profile?.email || member.userId}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-bold capitalize">
                          {member.role}
                        </span>
                        {memberTasksCount > 0 && (
                          <span
                            title={`${memberTasksCount} tasks assigned`}
                            className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-100/60 px-1.5 py-0.5 rounded-full shrink-0"
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
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
            className="px-4.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-[0.98]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
