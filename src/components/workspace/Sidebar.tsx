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
import type { Project, Task } from "@/types/workspace.types"

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
}

function SidebarContent({ workspaceName, projects = [] }: SidebarProps) {
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
    <aside className="w-64 border-r border-slate-200 bg-slate-50/80 p-4 flex flex-col gap-1 shrink-0 select-none hidden md:flex">
      {/* Workspace Label */}
      <div className="px-3 mb-3">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Workspace
        </div>
        <div className="text-sm font-semibold text-slate-800 truncate">
          {workspaceName}
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-slate-200 mb-2" />

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium
                transition-all duration-150
                ${
                  active
                    ? "bg-white border border-slate-200 text-slate-900 font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }
              `}
            >
              <Icon
                size={16}
                className={active ? "text-[#2d4a3e]" : "text-slate-400"}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="mt-5 flex flex-col gap-1">
          <div className="px-3 text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Projects Board</span>
            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
              {projects.length}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 max-h-[350px] overflow-y-auto pr-1">
            {projects.map((project) => {
              const isProjectActive = activeProjectId === project.id
              const isExpanded = expandedProjects.has(project.id)

              return (
                <div key={project.id} className="flex flex-col mb-1">
                  <div className="flex items-center justify-between w-full rounded-lg text-xs font-medium transition-all duration-150 hover:bg-white/60">
                    <Link
                      href={`/projects/${project.id}`}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-l-lg ${
                        isProjectActive
                          ? "text-slate-900 font-semibold bg-white/40 border-l-2 border-[#2d4a3e]"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <FolderKanban
                        size={14}
                        className={
                          isProjectActive ? "text-[#2d4a3e]" : "text-slate-400"
                        }
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                    <button
                      onClick={() => toggleProjectExpand(project.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    <div className="pl-6 flex flex-col gap-0.5 border-l border-slate-200 ml-5 py-1">
                      {project.tasks && project.tasks.length > 0 ? (
                        project.tasks.map((task) => {
                          const statusDotColor =
                            task.status === "done"
                              ? "bg-emerald-500"
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
        <div className="w-64 border-r border-slate-200 bg-slate-50/80 p-4" />
      }
    >
      <SidebarContent {...props} />
    </Suspense>
  )
}
