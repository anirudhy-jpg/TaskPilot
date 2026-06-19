import React from "react"
import Link from "next/link"
import { UserPlus, Trash2, Plus, MoreVertical, Edit2, ArrowLeft, Filter, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Project } from "../types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"
import { getProjectInitials, getUserInitials } from "@/features/project/utils/avatar"

interface ProjectBoardHeaderProps {
  activeProject: Project | null
  currentProjectMembers: WorkspaceMember[]
  isWorkspaceMember: boolean
  onManageMembers: () => void
  onDeleteProject: (target: { type: "project" | "task"; id: string; name: string }) => void
  onEditProject: () => void
  onNewProject: () => void
  onAddColumn?: () => void
  onAddTask?: () => void
  taskTypeFilter?: string[]
  setTaskTypeFilter?: React.Dispatch<React.SetStateAction<string[]>>
}

export function ProjectBoardHeader({
  activeProject,
  currentProjectMembers,
  isWorkspaceMember,
  onManageMembers,
  onDeleteProject,
  onEditProject,
  onNewProject,
  onAddColumn,
  taskTypeFilter = [],
  setTaskTypeFilter,
}: ProjectBoardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const filterMenuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
      if (isFilterMenuOpen && filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen, isFilterMenuOpen])

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div className="flex flex-wrap items-center gap-3">
        {activeProject ? (
          <>
            {/* Back to Projects Arrow */}
            <Link
              href="/projects"
              className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              title="Back to Projects"
            >
              <ArrowLeft size={18} />
            </Link>

            {/* Black Square Logo Icon */}
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950 text-amber-500 border border-slate-800 font-extrabold text-xs shadow-sm shrink-0 select-none">
              {activeProject.name[0].toUpperCase()}
            </div>

            {/* Project Title Block */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold text-slate-100 tracking-tight leading-none uppercase">
                  {getProjectInitials(activeProject.name)}
                </h1>

                {/* Project Menu */}
                {!isWorkspaceMember && (
                  <div ref={menuRef} className="relative shrink-0 flex items-center">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="text-slate-400 hover:text-slate-205 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                      title="Project Options"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute left-0 mt-1 top-6 w-36 bg-slate-900 border border-slate-800 rounded-lg shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                        <button
                          onClick={() => {
                            onEditProject()
                            setIsMenuOpen(false)
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-2"
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
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-450 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <Trash2 size={13} />
                          Delete project
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">
                {activeProject.name}
              </span>
            </div>

            {/* Vertical Separator */}
            <div className="h-6 w-px bg-slate-800 mx-2 shrink-0" />

            {/* Overlapping Avatar Stack of Project Members */}
            <div className="flex items-center -space-x-1.5 ml-2 shrink-0">
              {currentProjectMembers.map((m) => {
                const initials = getUserInitials(m.profile?.fullName, m.profile?.email);
                return (
                  <div
                    key={m.userId}
                    className="w-6 h-6 rounded-full bg-slate-950 text-slate-300 border border-slate-850 flex items-center justify-center font-extrabold text-[9px] shadow-2xs shrink-0 select-none"
                    title={m.profile?.fullName || m.profile?.email}
                  >
                    {initials}
                  </div>
                );
              }) }
              {!isWorkspaceMember &&(
                <button
                  onClick={onManageMembers}
                  className="text-slate-400 hover:text-amber-500 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center shrink-0 ml-1"
                  title="Manage project members"
                >
                  <UserPlus size={13} />
                </button>
              )}
            </div>
          </>
        ) : (
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
              Projects Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Overview of all active projects and task pipelines
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {activeProject ? (
          <>
            {/* Filter Dropdown */}
            {setTaskTypeFilter && (
              <div ref={filterMenuRef} className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`text-xs font-semibold px-3 h-10 transition-colors ${taskTypeFilter.length > 0 ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  <Filter size={14} className="mr-1.5" />
                  Filter {taskTypeFilter.length > 0 && `(${taskTypeFilter.length})`}
                </Button>
                {isFilterMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Type</span>
                    </div>
                    {[{ id: "task", label: "Task", icon: "📋" }, { id: "feature", label: "Feature", icon: "🚀" }, { id: "bug", label: "Bug", icon: "🐛" }, { id: "enhancement", label: "Enhancement", icon: "✨" }].map((type) => {
                      const isActive = taskTypeFilter.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => setTaskTypeFilter(prev => prev.includes(type.id) ? prev.filter(t => t !== type.id) : [...prev, type.id])}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                          {isActive && <Check size={14} className="text-amber-500" />}
                        </button>
                      )
                    })}
                    {taskTypeFilter.length > 0 && (
                      <div className="px-2 py-1 mt-1 border-t border-slate-800">
                        <button
                          onClick={() => setTaskTypeFilter([])}
                          className="w-full px-2 py-1.5 text-center text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {onAddColumn && (
              <Button
                onClick={onAddColumn}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 h-10 border-0 cursor-pointer shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 transition-all active:scale-[0.98]"
              >
                <Plus size={14} />
                Add Column
              </Button>
            )}
            <Link
              href="/projects"
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Back to Projects
            </Link>
          </>
        ) : (
          !isWorkspaceMember && (
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 text-xs font-black rounded-xl px-4 py-2 h-10 border-0 transition-all active:scale-[0.98]"
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
