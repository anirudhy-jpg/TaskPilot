import React from "react"
import Link from "next/link"
import { UserPlus, Trash2, Plus, MoreVertical, Edit2 } from "lucide-react"
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
  onEditProject: () => void
  onNewProject: () => void
  onAddColumn?: () => void
}

export function ProjectBoardHeader({
  activeProject,
  currentProjectMembers,
  isWorkspaceOwner,
  isWorkspaceMember,
  onManageMembers,
  onDeleteProject,
  onEditProject,
  onNewProject,
  onAddColumn,
}: ProjectBoardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

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
                  <div ref={menuRef} className="relative shrink-0 flex items-center">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                      title="Project Options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute left-0 mt-1.5 top-8 w-36 bg-white border border-amber-900/10 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                        <button
                          onClick={() => {
                            onEditProject()
                            setIsMenuOpen(false)
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <Edit2 size={13} />
                          Edit details
                        </button>
                        <button
                          onClick={() => {
                            onDeleteProject({
                              type: "project",
                              id: activeProject.id,
                              name: activeProject.name,
                            })
                            setIsMenuOpen(false)
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-red-655 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <Trash2 size={13} />
                          Delete project
                        </button>
                      </div>
                    )}
                  </div>
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
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of all active projects and task pipelines
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeProject ? (
          <>
            {onAddColumn && (() => {
              const isLimitReached = (activeProject?.columns || []).length >= 5;
              return (
                <Button
                  size="sm"
                  className={`shadow-3xs text-xs font-black rounded-xl px-4 py-2 ${
                    isLimitReached
                      ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-100"
                      : "bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer"
                  }`}
                  onClick={isLimitReached ? undefined : onAddColumn}
                  disabled={isLimitReached}
                  title={isLimitReached ? "A project cannot have more than 5 columns" : undefined}
                >
                  <Plus size={14} className="mr-1.5" />
                  <span>Add Column</span>
                </Button>
              );
            })()}
            <Link href="/projects">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/20 hover:bg-amber-500/5 text-amber-600 cursor-pointer text-xs font-semibold rounded-xl"
              >
                <span>Back to Projects</span>
              </Button>
            </Link>
          </>
        ) : (
          !isWorkspaceMember && (
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-955 cursor-pointer shadow-3xs text-xs font-black rounded-xl px-4 py-2"
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
