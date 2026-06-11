import React from "react"
import Link from "next/link"
import { UserPlus, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Project } from "../types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"

interface ProjectBoardHeaderProps {
  activeProject: Project | null
  currentProjectMembers: WorkspaceMember[]
  isWorkspaceOwner: boolean
  isWorkspaceMember: boolean
  onManageMembers: () => void
  onDeleteProject: (target: { type: "project" | "task"; id: string; name: string }) => void
  onNewProject: () => void
}

export function ProjectBoardHeader({
  activeProject,
  currentProjectMembers,
  isWorkspaceOwner,
  isWorkspaceMember,
  onManageMembers,
  onDeleteProject,
  onNewProject,
}: ProjectBoardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/10 pb-5">
      <div>
        {activeProject ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 font-extrabold text-xs shadow-3xs border border-amber-500/20 shrink-0">
                {activeProject.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl">
                  {activeProject.name}
                </h1>

                {/* Overlapping Avatar Stack of Project Members */}
                <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                  <div className="flex items-center">
                    {currentProjectMembers.slice(0, 4).map((m, i) => (
                      <div
                        key={m.userId}
                        className={`w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 border border-white flex items-center justify-center font-extrabold text-[9px] shadow-2xs shrink-0 select-none ${
                          i > 0 ? "-ml-2" : ""
                        }`}
                        title={m.profile?.fullName || m.profile?.email}
                      >
                        {(m.profile?.fullName || m.profile?.email || "?")[0].toUpperCase()}
                      </div>
                    ))}
                    {currentProjectMembers.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border border-white flex items-center justify-center font-bold text-[8px] -ml-2 shadow-2xs select-none">
                        +{currentProjectMembers.length - 4}
                      </div>
                    )}
                  </div>

                  {isWorkspaceOwner && (
                    <button
                      onClick={onManageMembers}
                      className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title="Manage project members"
                    >
                      <UserPlus size={14} />
                    </button>
                  )}
                </div>

                {!isWorkspaceMember && (
                  <button
                    onClick={() =>
                      onDeleteProject({
                        type: "project",
                        id: activeProject.id,
                        name: activeProject.name,
                      })
                    }
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Delete project"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            {activeProject.description && (
              <p className="text-xs text-slate-550 mt-1.5 pl-11 max-w-2xl leading-relaxed">
                {activeProject.description}
              </p>
            )}
            {(activeProject.creatorEmail || activeProject.creatorName) && (
              <p className="text-[10px] text-slate-400 pl-11 mt-1 font-semibold">
                created by: <span className="text-slate-550 font-bold">{activeProject.creatorName || activeProject.creatorEmail}</span>
              </p>
            )}
          </>
        ) : (
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Projects Dashboard
            </h1>
            <p className="text-xs text-slate-505 mt-0.5">
              Overview of all active projects and task pipelines
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeProject ? (
          <Link href="/projects">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/20 hover:bg-amber-500/5 text-amber-600 cursor-pointer text-xs font-semibold rounded-xl"
            >
              <span>Back to Projects</span>
            </Button>
          </Link>
        ) : (
          !isWorkspaceMember && (
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-3xs text-xs font-black rounded-xl px-4 py-2"
              onClick={onNewProject}
            >
              <Plus size={14} className="mr-1.5" />
              <span>New Project</span>
            </Button>
          )
        )}
      </div>
    </div>
  )
}
