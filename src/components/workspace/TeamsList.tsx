import React from "react"
import { FolderKanban, User } from "lucide-react"
import type { Project, WorkspaceMember } from "@/types/workspace.types"

interface TeamsListProps {
  projects: Project[]
  membersByProject: Record<string, WorkspaceMember[]>
}

export function TeamsList({ projects, membersByProject }: TeamsListProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Teams</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Members assigned to tasks in each project
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 rounded-xl bg-white border border-slate-200 text-center">
          <div className="text-3xl mb-3">👥</div>
          <p className="text-sm text-slate-500 mb-1">No projects yet</p>
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
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
              >
                {/* Project header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#2d4a3e]/10 flex items-center justify-center">
                    <FolderKanban size={16} className="text-[#2d4a3e]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {project.name}
                    </h3>
                    <p className="text-[10px] text-slate-400">
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
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80 hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#2d4a3e]/10 flex items-center justify-center text-[#2d4a3e] text-xs font-bold uppercase shrink-0">
                          {member.profile?.fullName?.[0] ||
                            member.profile?.email?.[0] ||
                            "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {member.profile?.fullName || "Unknown"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {member.profile?.email || member.userId}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium capitalize shrink-0">
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
