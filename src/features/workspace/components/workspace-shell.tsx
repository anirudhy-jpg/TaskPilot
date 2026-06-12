"use client"

import React, { useState, useEffect } from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { createClient } from "@/lib/supabase/client"
import { X } from "lucide-react"
import { useProjectsRealtime } from "../../project/hooks/use-projects-realtime"
import { useWorkspacesRealtime } from "../hooks/use-workspaces-realtime"
import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable"
import { useRouter } from "next/navigation"
import type { Project, Task } from "../../project/types/project.types"
import { EvictedModal } from "./modals/evicted-modal"

interface WorkspaceShellProps {
  children: React.ReactNode
  profile: any
  user: any
  isWorkspaceOwner: boolean
  workspaceId: string | null
  workspaceName: string
  workspaces: any[]
  currentUserId: string
  projectsWithTasks: any[]
  ownerEmail: string
}

export function WorkspaceShell({
  children,
  profile,
  user,
  isWorkspaceOwner,
  workspaceId,
  workspaceName,
  workspaces,
  currentUserId,
  projectsWithTasks,
  ownerEmail,
}: WorkspaceShellProps) {
  const router = useRouter()
  const [localWorkspaceName, setLocalWorkspaceName] = useState(workspaceName)
  const [localProjects, setLocalProjects] = useState<(Project & { tasks: Task[] })[]>(projectsWithTasks)
  const [localWorkspaces, setLocalWorkspaces] = useState(workspaces)
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(null)
  const [isEvicted, setIsEvicted] = useState(false)

  useEffect(() => {
    setLocalWorkspaceName(workspaceName)
  }, [workspaceName])

  useEffect(() => {
    setLocalProjects(projectsWithTasks)
  }, [projectsWithTasks])

  useEffect(() => {
    setLocalWorkspaces(workspaces)
  }, [workspaces])

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).isLeavingWorkspace = false
    }
  }, [workspaceId])

  // Get current user's membership row ID to detect eviction via DELETE payload IDs
  useEffect(() => {
    if (!workspaceId || !currentUserId) return
    const getMyMembership = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", currentUserId)
        .maybeSingle()
      if (data) {
        setCurrentUserMemberId(data.id)
      }
    }
    getMyMembership()
  }, [workspaceId, currentUserId])

  // Subscriptions
  useWorkspacesRealtime({
    workspaces: localWorkspaces,
    setWorkspaces: setLocalWorkspaces,
    onWorkspaceUpdate: (updated) => {
      if (updated.id === workspaceId) {
        setLocalWorkspaceName(updated.name)
      }
    },
    onWorkspaceDelete: (deletedId) => {
      if (deletedId === workspaceId) {
        router.push("/workspaces")
        router.refresh()
      }
    },
  })

  useProjectsRealtime({
    workspaceId,
    projects: localProjects,
    setProjects: setLocalProjects as React.Dispatch<React.SetStateAction<(Project & { tasks: Task[] })[]>>,
  })

  // Eviction listener via database change event
  useRealtimeSubscription({
    table: "workspace_members",
    filter: undefined,
    onPayload: (payload) => {
      const { eventType, old: oldRow } = payload
      if (eventType === "DELETE" && oldRow) {
        const deletedId = (oldRow as any).id
        if (currentUserMemberId && deletedId === currentUserMemberId) {
          if (typeof window !== "undefined" && (window as any).isLeavingWorkspace) {
            // Voluntary leave, ignore eviction modal
            return
          }
          setIsEvicted(true)
        }
      }
    },
  })

  // Eviction listener via Broadcast (backup/instant for RLS bypass)
  useEffect(() => {
    if (!workspaceId) return
    const supabase = createClient()
    const channel = supabase.channel(`room:${workspaceId}`)

    channel
      .on("broadcast", { event: "evict" }, (response) => {
        const { userId, memberId } = response.payload || {}
        if (
          (userId && userId === currentUserId) ||
          (memberId && memberId === currentUserMemberId)
        ) {
          if (typeof window !== "undefined" && (window as any).isLeavingWorkspace) {
            // Voluntary leave, ignore eviction modal
            return
          }
          setIsEvicted(true)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, currentUserId, currentUserMemberId])

  useRealtimeSubscription({
    table: "tasks",
    onPayload: (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload

      if (eventType === "DELETE" && oldRow) {
        const deletedTaskId = (oldRow as any).id
        setLocalProjects((prev) =>
          prev.map((proj) => ({
            ...proj,
            tasks: proj.tasks.filter((t) => t.id !== deletedTaskId),
          }))
        )
        return
      }

      const projectId = (newRow as any)?.project_id
      if (!projectId) return

      setLocalProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj

          if (eventType === "INSERT" && newRow) {
            const r = newRow as any
            const newTask: Task = {
              id: r.id,
              projectId: r.project_id,
              title: r.title,
              description: r.description || null,
              status: r.status || "todo",
              columnId: r.column_id || r.status || "",
              priority: r.priority || "medium",
              position: typeof r.position === "number" ? r.position : 0,
              assigneeId: r.assigned_to || null,
              createdAt: r.created_at || new Date().toISOString(),
            }
            const exists = proj.tasks.some((t) => t.id === newTask.id)
            if (exists) return proj
            return {
              ...proj,
              tasks: [...proj.tasks, newTask],
            }
          } else if (eventType === "UPDATE" && newRow) {
            const r = newRow as any
            return {
              ...proj,
              tasks: proj.tasks.map((t) =>
                t.id === r.id
                  ? {
                      ...t,
                      title: r.title,
                      status: r.status,
                      columnId: r.column_id || r.status || t.columnId,
                      priority: r.priority || t.priority,
                      assigneeId: r.assigned_to || t.assigneeId,
                      dueDate: r.due_date || (t as any).dueDate,
                      description: r.description || t.description,
                      position: typeof r.position === "number" ? r.position : t.position,
                    }
                  : t
              ),
            }
          }
          return proj
        })
      )
    },
  })

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Automatically close sidebar when navigation/content changes
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [children])

  return (
    <div className="h-screen bg-gradient-to-br from-[#fffdf9] via-[#fbfaf8] to-[#f6f5f0] dark:from-[#0f0e0c] dark:via-[#131211] dark:to-[#181613] text-slate-900 dark:text-slate-100 flex flex-col font-sans w-full relative overflow-hidden">
      {/* Ambient glows (High-vibrancy gold, smoky dark, and warm rose-red highlights) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[55%] rounded-full bg-amber-400/20 dark:bg-amber-500/12 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[45%] rounded-full bg-rose-500/15 dark:bg-rose-600/8 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[40%] h-[40%] rounded-full bg-amber-50/15 dark:bg-amber-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] rounded-full bg-slate-400/12 dark:bg-slate-800/10 blur-[110px] pointer-events-none" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <Header
        profile={profile}
        user={user}
        isWorkspaceOwner={isWorkspaceOwner}
        workspaceId={workspaceId}
        workspaceName={localWorkspaceName}
        workspaces={localWorkspaces}
        currentUserId={currentUserId}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {/* ── Main Area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden w-full relative z-10">
        {/* Desktop Sidebar */}
        <Sidebar
          workspaceName={localWorkspaceName}
          projects={localProjects}
          ownerEmail={ownerEmail}
          variant="desktop"
        />

        {/* Mobile Sidebar Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-64 bg-white dark:bg-[#131211] border-r border-amber-900/10 flex flex-col z-50 animate-in slide-in-from-left duration-250">
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800 transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <Sidebar
                workspaceName={localWorkspaceName}
                projects={localProjects}
                ownerEmail={ownerEmail}
                variant="mobile"
                onClose={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-transparent flex flex-col gap-6 relative w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      <EvictedModal
        isOpen={isEvicted}
      />
    </div>
  )
}
