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
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

interface SidebarProps {
  workspaceName: string
  projects?: (Project & { tasks: Task[] })[]
  ownerEmail?: string | null
}

function SidebarContent({ workspaceName, projects = [], ownerEmail = null }: SidebarProps) {
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

  return (
    <aside className="w-64 border-r border-amber-900/10 bg-white/50 backdrop-blur-xl p-5 flex flex-col gap-1 shrink-0 select-none hidden md:flex">
      {/* Workspace Label */}
      <div className="px-3 mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wider mb-1">
            Workspace
          </div>
          <div className="text-sm font-bold text-slate-800 truncate max-w-[140px]" title={workspaceName}>
            {workspaceName}
          </div>
        </div>
        <Link
          href="/workspaces"
          className="text-[10px] text-amber-600 hover:text-amber-800 font-extrabold hover:underline cursor-pointer border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-md transition-all active:scale-[0.95]"
        >
          Switch
        </Link>
      </div>

      {/* Divider */}
      <div className="border-b border-amber-955/10 mb-3" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-250 group
                ${
                  active
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.03]"
                    : "text-slate-655 hover:text-slate-900 hover:bg-white/80 hover:translate-x-1"
                }
              `}
            >
              <Icon
                size={16}
                className={active ? "text-slate-950" : "text-slate-400 group-hover:text-slate-700"}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="mt-5 flex flex-col gap-1">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Projects Board</span>
            <span className="text-[9px] bg-amber-600/10 text-amber-800 px-2 py-0.5 rounded-full font-bold">
              {projects.length}
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
            {projects.map((project) => {
              const isProjectActive = activeProjectId === project.id
              const isExpanded = expandedProjects.has(project.id)

              return (
                <div key={project.id} className="flex flex-col mb-1">
                  <div className="flex items-center justify-between w-full rounded-xl text-xs font-medium transition-all duration-200 hover:bg-white/50">
                    <Link
                      href={`/projects/${project.id}`}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-l-xl ${
                        isProjectActive
                          ? "text-amber-955 font-extrabold bg-gradient-to-r from-amber-50 to-white/70 border-l-3 border-amber-600 shadow-3xs"
                          : "text-slate-655 hover:text-slate-955 hover:translate-x-0.5"
                      }`}
                    >
                      <FolderKanban
                        size={14}
                        className={
                          isProjectActive ? "text-amber-600" : "text-slate-400"
                        }
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate leading-normal">{project.name}</span>
                        {(project.creatorName || project.creatorEmail) && (
                          <span className="text-[9px] text-slate-450 font-normal truncate mt-0.5" title={`Created by: ${project.creatorEmail}`}>
                            created by: {project.creatorName || project.creatorEmail}
                          </span>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => toggleProjectExpand(project.id)}
                      className="p-1.5 text-slate-455 hover:text-slate-650 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                    </button>
                  </div>

                  {/* Task list inside project */}
                  {isExpanded && (
                    <div className="pl-5 flex flex-col gap-1 border-l border-amber-900/5 ml-5 py-1.5">
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
                              className="flex items-center gap-2 px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 rounded transition-colors truncate"
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
                        <span className="text-[10px] text-slate-400 italic px-2 py-0.5">
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
    </aside>
  )
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <div className="w-64 border-r border-amber-900/5 bg-white/45 backdrop-blur-lg p-5" />
      }
    >
      <SidebarContent {...props} />
    </Suspense>
  )
}
