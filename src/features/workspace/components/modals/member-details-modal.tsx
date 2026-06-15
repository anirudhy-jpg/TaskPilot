"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { X, User, Calendar, FolderKanban, CheckSquare, Clock, Circle, CheckCircle2, AlertCircle, AlertTriangle, Info, Shield } from "lucide-react"
import type { Project, Task, TaskPriority } from "@/features/project/types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"
import { getMemberDetailsAction } from "@/features/workspace/actions/get-member-details.action"

interface MemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  member: WorkspaceMember | null
  workspaceId: string
}

type ExtendedTask = Task & { projectName?: string }

const defaultStatusConfig = {
  todo: { label: "To Do", color: "text-blue-700 bg-blue-50 border-blue-100/60", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-700 bg-amber-50 border-amber-250/50", icon: Clock },
  done: { label: "Done", color: "text-rose-700 bg-rose-50 border-rose-255/50", icon: CheckCircle2 },
}

const statusTabs = [
  { id: "all", label: "All" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
]

export function MemberDetailsModal({ isOpen, onClose, member, workspaceId }: MemberDetailsModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<ExtendedTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("all")

  // Fetch member project and task assignments on open
  useEffect(() => {
    if (isOpen && member?.userId) {
      setIsLoading(true)
      setError(null)
      setActiveTab("all")
      getMemberDetailsAction(workspaceId, member.userId)
        .then((res) => {
          if (res.success) {
            setProjects(res.projectsJoined || [])
            setTasks(res.tasksAssigned || [])
          } else {
            setError(res.error || "Failed to load member details.")
          }
        })
        .catch((err) => {
          console.error("Error loading member details:", err)
          setError("An unexpected error occurred while loading member details.")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen, member?.userId, workspaceId])

  // Keydown listener for Escape key to close modal
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

  if (!isOpen || !member) return null

  const filteredTasks = activeTab === "all" ? tasks : tasks.filter((t) => t.status === activeTab)

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

  // Member role color configuration
  const roleStyles = {
    owner: "bg-red-50 text-red-750 border-red-100/60",
    admin: "bg-amber-50 text-amber-750 border-amber-200/40",
    member: "bg-blue-50 text-blue-750 border-blue-100/60",
  }[member.role || "member"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-4xl w-full h-[580px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-10">
        
        {/* Header (Profile Intro) */}
        <div className="p-6 pb-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/30">
          <div className="flex items-center gap-4 min-w-0">
            {/* Large Avatar */}
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700 text-base font-black uppercase shrink-0 border border-amber-500/10 shadow-3xs">
              {member.profile?.fullName?.[0] || member.profile?.email?.[0] || "?"}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                  {member.profile?.fullName || "Active Member"}
                </h3>
                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${roleStyles}`}>
                  <Shield size={10} />
                  <span>{member.role || "member"}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {member.profile?.email || member.userId}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 font-bold">
                <Calendar size={12} />
                <span>Joined workspace on {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "N/A"}</span>
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

        {/* Quick Stats Summary Row */}
        <div className="px-6 py-3.5 bg-amber-500/[0.02] border-b border-slate-150 flex flex-wrap items-center gap-5 text-[11px] select-none">
          <div className="flex items-center gap-1.5 font-bold text-slate-550">
            <FolderKanban size={13} className="text-slate-400" />
            <span>Assigned Projects: <strong className="text-slate-800 text-xs font-black">{projects.length}</strong></span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-1.5 font-bold text-slate-550">
            <CheckSquare size={13} className="text-slate-400" />
            <span>Total Tasks: <strong className="text-slate-800 text-xs font-black">{tasks.length}</strong></span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-1.5 font-bold text-slate-550">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Tasks Completed: <strong className="text-emerald-700 text-xs font-black">{tasks.filter(t => t.status === "done").length}</strong></span>
          </div>
        </div>

        {/* Body Split */}
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-150 overflow-hidden flex-1 min-h-0">
          
          {/* Left panel: Projects list (45% width) */}
          <div className="w-full lg:max-w-xs xl:max-w-sm p-6 overflow-y-auto flex flex-col gap-4 shrink-0 bg-slate-50/15">
            <div className="flex items-center gap-2 shrink-0">
              <FolderKanban size={16} className="text-slate-500" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Assigned Projects ({projects.length})
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
              {isLoading ? (
                // Skeletons
                [0, 1].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-white animate-pulse space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded-lg w-2/3" />
                    <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                  </div>
                ))
              ) : projects.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic bg-white border border-dashed border-slate-200 rounded-xl">
                  Not assigned to any projects yet.
                </div>
              ) : (
                projects.map((project) => {
                  const projStatusStyles = {
                    active: "bg-emerald-50 text-emerald-700 border-emerald-100/60",
                    completed: "bg-blue-50 text-blue-700 border-blue-100/60",
                    archived: "bg-slate-50 text-slate-600 border-slate-200/60",
                  }[project.status || "active"]

                  return (
                    <div
                      key={project.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-3xs flex flex-col gap-2.5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-xs font-bold text-slate-800 leading-snug truncate">
                            {project.name}
                          </h4>
                          <span className={`text-[8px] font-black px-1.5 py-0.25 rounded border uppercase shrink-0 ${projStatusStyles}`}>
                            {project.status || "active"}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-[10px] text-slate-450 line-clamp-2 mt-1 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-50 flex justify-end">
                        <Link
                          href={`/projects/${project.id}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-1 text-[9.5px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-250/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <FolderKanban size={10} />
                          <span>Open Board</span>
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right panel: Tasks listing (55% width) */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-slate-500" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Assigned Tasks</span>
                <span className="text-[10px] font-black px-1.5 py-0.25 bg-slate-100 border border-slate-200 rounded-full text-slate-650">
                  {tasks.length}
                </span>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 pb-1 overflow-x-auto border-b border-slate-100 shrink-0 select-none">
              {statusTabs.map((tab) => {
                const count = tab.id === "all" ? tasks.length : tasks.filter((t) => t.status === tab.id).length
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent"
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Tasks Scrollable List */}
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
                      ? "This member has no tasks assigned in this workspace."
                      : `No tasks are currently in "${statusTabs.find((t) => t.id === activeTab)?.label}".`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTasks.map((task) => {
                    const priorityStyle = getPriorityStyle(task.priority)
                    const fallbackConfig = defaultStatusConfig[task.status as keyof typeof defaultStatusConfig]
                    const statusLabel = fallbackConfig?.label || "Unknown"
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
                          <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold">
                            <FolderKanban size={11} />
                            <span className="text-slate-650 max-w-[120px] truncate">{task.projectName}</span>
                          </div>

                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
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
