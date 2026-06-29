"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { X, Calendar, FolderKanban, CheckSquare, AlertCircle, AlertTriangle, Info, Shield, MessageSquare } from "lucide-react"
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



export function MemberDetailsModal({ isOpen, onClose, member, workspaceId }: MemberDetailsModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<ExtendedTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch member project and task assignments on open
  useEffect(() => {
    if (isOpen && member?.userId) {
      setIsLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
      setError(null)
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

  const filteredTasks = tasks

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
        border: "border-l-[3.5px] border-l-slate-655",
        badge: "bg-slate-500/10 text-slate-400 border-slate-850",
        icon: <Info size={10} className="text-slate-500" />,
        label: "Low",
      },
    }[priority || "medium"]
  }

  // Member role color configuration
  const roleStyles = {
    owner: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    admin: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    member: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }[member.role || "member"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-955/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-4xl w-full h-[580px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-10">
        
        {/* Header (Profile Intro) */}
        <div className="p-6 pb-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900">
          <div className="flex items-center gap-4 min-w-0">
            {/* Large Avatar */}
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-base font-black uppercase shrink-0 border border-amber-500/15 shadow-3xs">
              {member.profile?.fullName?.[0] || member.profile?.email?.[0] || "?"}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-100 leading-snug">
                  {member.profile?.fullName || "Active Member"}
                </h3>
                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${roleStyles}`}>
                  <Shield size={10} />
                  <span>{member.role || "member"}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {member.profile?.email || member.userId}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 font-bold">
                <Calendar size={12} />
                <span>Joined workspace on {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "N/A"}</span>
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

        {/* Quick Stats Summary Row */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-5 text-[11px] select-none">
          <div className="flex items-center gap-1.5 font-bold text-slate-400">
            <FolderKanban size={13} className="text-slate-500" />
            <span>Assigned Projects: <strong className="text-slate-200 text-xs font-black">{projects.length}</strong></span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-800" />
          <div className="flex items-center gap-1.5 font-bold text-slate-400">
            <CheckSquare size={13} className="text-slate-500" />
            <span>Total Tasks: <strong className="text-slate-200 text-xs font-black">{tasks.length}</strong></span>
          </div>

        </div>

        {/* Body Split */}
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden flex-1 min-h-0">
          
          {/* Left panel: Projects list (45% width) */}
          <div className="w-full lg:max-w-xs xl:max-w-sm p-6 overflow-y-auto flex flex-col gap-4 shrink-0 bg-slate-900">
            <div className="flex items-center gap-2 shrink-0">
              <FolderKanban size={16} className="text-slate-400" />
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                Assigned Projects ({projects.length})
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
              {isLoading ? (
                // Skeletons
                [0, 1].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 animate-pulse space-y-2">
                    <div className="h-3.5 bg-slate-800 rounded-lg w-2/3" />
                    <div className="h-3 bg-slate-800 rounded-lg w-1/2" />
                  </div>
                ))
              ) : projects.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs italic bg-slate-950 border border-dashed border-slate-800 rounded-xl">
                  Not assigned to any projects yet.
                </div>
              ) : (
                projects.map((project) => {
                  const projStatusStyles = {
                    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    archived: "bg-slate-800 text-slate-400 border-slate-700",
                  }[project.status || "active"]

                  return (
                    <div
                      key={project.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-700 transition-all shadow-3xs flex flex-col gap-2.5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-xs font-bold text-slate-200 leading-snug truncate">
                            {project.name}
                          </h4>
                          <span className={`text-[8px] font-black px-1.5 py-0.25 rounded border uppercase shrink-0 ${projStatusStyles}`}>
                            {project.status || "active"}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex justify-end">
                        <Link
                          href={`/projects/${project.id}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-1 text-[9.5px] font-black text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 min-h-0 bg-slate-900">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-slate-400" />
                <span className="text-xs font-black text-slate-350 uppercase tracking-wider">Assigned Tasks</span>
                <span className="text-[10px] font-black px-1.5 py-0.25 bg-slate-950 border border-slate-850 rounded-full text-slate-300">
                  {tasks.length}
                </span>
              </div>
            </div>

            {/* Tasks count label */}
            <div className="pb-1 border-b border-slate-800 shrink-0 select-none">
              <span className="px-3 py-1.5 text-[10px] font-black rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/20">
                All ({tasks.length})
              </span>
            </div>

            {/* Tasks Scrollable List */}
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
                    This member has no tasks assigned in this workspace.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTasks.map((task) => {
                    const priorityStyle = getPriorityStyle(task.priority)

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
                          <div className="flex items-center gap-1.5 text-slate-500 text-[9px] font-bold">
                            <FolderKanban size={11} />
                            <span className="text-slate-400 max-w-[120px] truncate">{task.projectName}</span>
                          </div>


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
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-[0.98]"
          >
            Close
          </button>
          <Link
            href={`/chat?userId=${member.userId}`}
            onClick={onClose}
            className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-[0.98] flex items-center gap-2"
          >
            <MessageSquare size={14} />
              Chat
          </Link>
        </div>
      </div>
    </div>
  )
}
