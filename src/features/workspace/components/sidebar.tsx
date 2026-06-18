"use client"

import React, { useState, Suspense } from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import type { Project, Task } from "../../project/types/project.types"

const navItems = [
  {
    label: "Overview",
    href: "/workspace",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Teams",
    href: "/teams",
    icon: UserCog,
  },
  {
    label: "Members",
    href: "/members",
    icon: Users,
  },
]

interface SidebarProps {
  workspaceName: string
  projects?: (Project & { tasks: Task[] })[]
  ownerEmail?: string | null
  variant?: "desktop" | "mobile"
  onClose?: () => void
}

function SidebarContent({
  workspaceName,
  projects = [],
  variant = "desktop",
  onClose,
}: SidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const activeProjectId = params?.projectId as string || null

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(projects.map((p) => p.id)) // Expand all by default
  )

  function isActive(href: string) {
    if (href === "/workspace") return pathname === "/workspace"
    return pathname.startsWith(href)
  }

  function toggleProjectExpand(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  const asideClasses =
    variant === "mobile"
      ? "flex flex-col w-full h-full bg-[#090d16]/95 p-5 gap-1 select-none overflow-y-auto scrollbar-thin text-slate-100"
      : "flex flex-col w-64 border-r border-slate-800 bg-[#090d16]/80 backdrop-blur-md p-5 gap-1 shrink-0 select-none hidden md:flex overflow-y-auto h-full scrollbar-thin text-slate-100"

  return (
    <aside className={asideClasses}>
      {/* Workspace Label */}
      <div className="px-3 mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-amber-500/60 uppercase tracking-wider mb-1">
            Workspace
          </div>
          <div className="text-base font-bold text-slate-200 truncate max-w-[140px]" title={workspaceName}>
            {workspaceName}
          </div>
        </div>
        <Link
          href="/workspaces"
          onClick={handleLinkClick}
          className="text-xs text-amber-500 hover:text-amber-400 font-extrabold cursor-pointer border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-md transition-all active:scale-[0.95]"
        >
          Switch
        </Link>
      </div>

      {/* Divider */}
      <div className="border-b border-slate-800/80 mb-3" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={handleLinkClick}
              className={`
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-black transition-all duration-250 group
                ${
                  active
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.03]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:translate-x-1"
                }
              `}
            >
              <Icon
                size={16}
                className={active ? "text-slate-950" : "text-slate-400 group-hover:text-slate-350"}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="mt-5 flex flex-col gap-1">
          <div className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Projects Board</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">
              {projects.length}
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
            {projects.map((project) => {
              const isProjectActive = activeProjectId === project.id
              const isExpanded = expandedProjects.has(project.id)

              return (
                <div key={project.id} className="flex flex-col mb-1">
                  <div className="flex items-center justify-between w-full rounded-xl text-sm font-medium transition-all duration-200 hover:bg-slate-900/40">
                    <Link
                      href={`/projects/${project.id}`}
                      onClick={handleLinkClick}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-l-xl ${
                        isProjectActive
                          ? "text-amber-500 font-extrabold bg-slate-900/80 border-l-3 border-amber-500 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:translate-x-0.5"
                      }`}
                    >
                      <FolderKanban
                        size={15}
                        className={
                          isProjectActive ? "text-amber-500" : "text-slate-400"
                        }
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate leading-normal text-slate-200">{project.name}</span>
                        {(project.creatorName || project.creatorEmail) && (
                          <span className="text-[10px] text-slate-500 font-normal truncate mt-0.5" title={`Created by: ${project.creatorEmail}`}>
                            created by: {project.creatorName || project.creatorEmail}
                          </span>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => toggleProjectExpand(project.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-205 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </div>

                  {/* Task list inside project */}
                  {isExpanded && (
                    <div className="pl-5 flex flex-col gap-1 border-l border-slate-800 ml-5 py-1.5">
                      {project.tasks && project.tasks.length > 0 ? (
                        project.tasks.map((task) => {
                          const statusDotColor =
                            task.status === "done"
                              ? "bg-rose-500"
                              : task.status === "in_progress"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          return (
                            <Link
                              key={task.id}
                              href={`/projects/${project.id}`}
                              onClick={handleLinkClick}
                              className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 rounded transition-colors truncate"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusDotColor} shrink-0`}
                              />
                              <span className="truncate" title={task.title}>
                                {task.title}
                              </span>
                            </Link>
                          )
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic px-2 py-0.5">
                          No tasks
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Settings at the bottom */}
      <div className="mt-auto pt-4 border-t border-slate-800/60">
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className={`
            flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-black transition-all duration-250 group
            ${
              isActive("/settings")
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.03]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:translate-x-1"
            }
          `}
        >
          <Settings
            size={16}
            className={isActive("/settings") ? "text-slate-950" : "text-slate-400 group-hover:text-slate-350"}
          />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  )
}

export function Sidebar(props: SidebarProps) {
  const fallbackClasses =
    props.variant === "mobile"
      ? "w-full h-full bg-[#090d16]/95 p-5"
      : "w-64 border-r border-slate-800 bg-[#090d16]/80 backdrop-blur-md p-5 hidden md:flex h-full shrink-0"

  return (
    <Suspense
      fallback={
        <div className={`${fallbackClasses} animate-pulse`} />
      }
    >
      <SidebarContent {...props} />
    </Suspense>
  )
}

