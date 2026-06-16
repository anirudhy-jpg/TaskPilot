"use client"

import React, { useState, useEffect } from "react"
import { FolderKanban, User, Users } from "lucide-react"
import type { WorkspaceMember } from "../types/workspace.types"
import type { Project } from "../../project/types/project.types"
import { Pagination } from "@/components/ui/pagination"
import { TeamDetailsModal } from "./modals/team-details-modal"

interface TeamsListProps {
  projects: Project[]
  membersByProject: Record<string, WorkspaceMember[]>
}

const getAbbreviation = (name: string) => {
  return name
    .split(/[\s\-_]+/)
    .map((word) => word[0])
    .join("")
    .substring(0, 3)
    .toUpperCase()
}

export function TeamsList({ projects, membersByProject }: TeamsListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const itemsPerPage = 4
  const totalItems = projects.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProjects = projects.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight sm:text-2xl">
            Teams
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Members assigned to tasks in each project.
          </p>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6 pr-1 scrollbar-thin">
        {projects.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 text-center">
            <div className="text-3xl mb-3">👥</div>
            <p className="text-sm text-slate-300 mb-1">No projects yet</p>
            <p className="text-xs text-slate-400">
              Create projects and assign tasks to members to see teams here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedProjects.map((project) => {
                const members = membersByProject[project.id] || []
                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 cursor-pointer hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 flex flex-col justify-between min-h-[280px]"
                  >
                    <div>
                      {/* Project/Team header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                            <Users size={16} className="text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-200 truncate">
                              {project.name}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                              {project.description || "No description provided"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-950 border border-slate-800/80 px-2 py-0.5 rounded-md shrink-0">
                          {members.length} member{members.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Members section */}
                      <div className="mb-4">
                        <div className="text-[9px] font-extrabold text-slate-500 tracking-wider uppercase mb-2">
                          Members
                        </div>
                        {members.length > 0 ? (
                          <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                            {members.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between py-1 border-b border-slate-800/20 last:border-0"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-955 border border-slate-850 flex items-center justify-center text-slate-300 text-[9px] font-black uppercase shrink-0">
                                    {member.profile?.fullName?.[0] ||
                                      member.profile?.email?.[0] ||
                                      "?"}
                                  </div>
                                  <span className="text-xs font-bold text-slate-200 truncate">
                                    {member.profile?.fullName || "Unknown"}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-500 font-bold capitalize shrink-0">
                                  {member.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic py-1">
                            No members assigned to tasks yet
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Projects section */}
                    <div>
                      <div className="text-[9px] font-extrabold text-slate-500 tracking-wider uppercase mb-2">
                        Projects
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-955 border border-slate-800/80 text-slate-400 uppercase">
                          {getAbbreviation(project.name)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              itemName="projects"
            />
          </div>
        )}
      </div>

      <TeamDetailsModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        members={selectedProject ? (membersByProject[selectedProject.id] || []) : []}
      />
    </div>
  )
}

