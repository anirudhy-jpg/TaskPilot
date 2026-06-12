import React from "react"
import { FolderKanban, User } from "lucide-react"
import type { WorkspaceMember } from "../types/workspace.types"
import type { Project } from "../../project/types/project.types"

interface TeamsListProps {
  projects: Project[]
  membersByProject: Record<string, WorkspaceMember[]>
}

export function TeamsList({ projects, membersByProject }: TeamsListProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/10 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl">
            Teams
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Members assigned to tasks in each project.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/70 backdrop-blur-md border border-amber-900/5 text-center">
          <div className="text-3xl mb-3">👥</div>
          <p className="text-sm text-slate-550 mb-1">No projects yet</p>
          <p className="text-xs text-slate-400">
            Create projects and assign tasks to members to see teams here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((project) => {
            const members = membersByProject[project.id] || []
            return (
              <div
                key={project.id}
                className="p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-amber-900/5 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.03)]"
              >
                {/* Project header */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <FolderKanban size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      {project.name}
                    </h3>
                    <p className="text-[10px] text-slate-450 font-medium mt-0.5">
                      {members.length} member{members.length !== 1 ? "s" : ""}{" "}
                      assigned
                    </p>
                  </div>
                </div>

                {/* Member list */}
                {members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/50 hover:bg-white transition-all shadow-3xs"
                      >
                        <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700 text-xs font-extrabold uppercase shrink-0">
                          {member.profile?.fullName?.[0] ||
                            member.profile?.email?.[0] ||
                            "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {member.profile?.fullName || "Unknown"}
                          </p>
                          <p className="text-[10px] text-slate-455 truncate">
                            {member.profile?.email || member.userId}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 font-bold capitalize shrink-0">
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <User size={14} />
                    <span>No members assigned to tasks yet</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
