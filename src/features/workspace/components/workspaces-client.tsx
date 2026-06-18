"use client"

import React, { useState, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Briefcase, Plus, Loader2, ArrowRight, ShieldCheck, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Workspace } from "../types/workspace.types"
import { switchActiveWorkspaceAction } from "../actions/switch-active-workspace.action"
import { createWorkspaceAction } from "../actions/create-workspace.action"
import { leaveWorkspaceAction } from "../actions/leave-workspace.action"
import { deleteWorkspaceAction } from "../actions/delete-workspace.action"
import { DeleteConfirmModal } from "./modals/delete-confirm-modal"
import { SwitchingWorkspaceLoading } from "./switching-workspace-loading"
import { useWorkspacesRealtime } from "../hooks/use-workspaces-realtime"

import { createClient } from "@/lib/supabase/client"

interface WorkspacesClientProps {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  currentUserId: string
}

export function WorkspacesClient({
  workspaces,
  activeWorkspaceId,
  currentUserId,
}: WorkspacesClientProps) {
  const router = useRouter()
  const [localWorkspaces, setLocalWorkspaces] = useState(workspaces)

  useEffect(() => {
    setLocalWorkspaces(workspaces)
  }, [workspaces])

  useWorkspacesRealtime({
    workspaces: localWorkspaces,
    setWorkspaces: setLocalWorkspaces,
  })

  const [isPending, startTransition] = useTransition()
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Leave / Delete modal states
  const [leaveWorkspaceId, setLeaveWorkspaceId] = useState<string | null>(null)
  const [leaveWorkspaceName, setLeaveWorkspaceName] = useState<string>("")
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null)
  const [deleteWorkspaceName, setDeleteWorkspaceName] = useState<string>("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Separate owned and member workspaces
  const ownedWorkspaces = localWorkspaces.filter((w) => w.ownerId === currentUserId)
  const memberWorkspaces = localWorkspaces.filter((w) => w.ownerId !== currentUserId)

  // Handle Workspace Leave
  const handleLeave = (e: React.MouseEvent, workspaceId: string, name: string) => {
    e.stopPropagation()
    setLeaveWorkspaceId(workspaceId)
    setLeaveWorkspaceName(name)
  }

  const handleLeaveConfirm = () => {
    if (!leaveWorkspaceId) return
    const workspaceId = leaveWorkspaceId
    setLeavingId(workspaceId)
    setErrorMsg(null)
    setLeaveWorkspaceId(null)
    if (typeof window !== "undefined") {
      (window as any).isLeavingWorkspace = true
    }

    // Broadcast leave event to remove member instantly on owner/other clients
    try {
      const supabase = createClient()
      const channel = supabase.channel(`room:${workspaceId}`)
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "evict",
            payload: { userId: currentUserId },
          })
          await supabase.removeChannel(channel)
        }
      })
    } catch (err) {
      console.warn("Failed to broadcast leave event:", err)
    }

    startTransition(async () => {
      const res = await leaveWorkspaceAction(workspaceId)
      if (res.success) {
        router.push("/workspaces")
        router.refresh()
      } else {
        if (typeof window !== "undefined") {
          (window as any).isLeavingWorkspace = false
        }
        setErrorMsg(res.error || "Failed to leave workspace.")
        setLeavingId(null)
      }
    })
  }

  // Handle Workspace Delete
  const handleDelete = (e: React.MouseEvent, workspaceId: string, name: string) => {
    e.stopPropagation()
    setDeleteWorkspaceId(workspaceId)
    setDeleteWorkspaceName(name)
  }

  const handleDeleteConfirm = () => {
    if (!deleteWorkspaceId) return
    const workspaceId = deleteWorkspaceId
    setDeletingId(workspaceId)
    setErrorMsg(null)
    setDeleteWorkspaceId(null)
    if (typeof window !== "undefined") {
      (window as any).isLeavingWorkspace = true
    }
    startTransition(async () => {
      const res = await deleteWorkspaceAction(workspaceId)
      if (res.success) {
        router.push("/workspaces")
        router.refresh()
      } else {
        if (typeof window !== "undefined") {
          (window as any).isLeavingWorkspace = false
        }
        setErrorMsg(res.error || "Failed to delete workspace.")
        setDeletingId(null)
      }
    })
  }

  // Handle Workspace Switch
  const handleSwitch = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      // Already active, just go back to overview
      router.push("/workspace")
      router.refresh()
      return
    }

    setSwitchingId(workspaceId)
    setErrorMsg(null)
    startTransition(async () => {
      const res = await switchActiveWorkspaceAction(workspaceId)
      if (res.success) {
        router.push("/workspace")
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to switch active workspace.")
        setSwitchingId(null)
      }
    })
  }

  // Handle Workspace Creation
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return

    setErrorMsg(null)
    startTransition(async () => {
      const res = await createWorkspaceAction(newWorkspaceName.trim())
      if (res.success && res.workspaceId) {
        setNewWorkspaceName("")
        router.push("/workspace")
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to create workspace.")
      }
    })
  }

  const renderWorkspaceCard = (ws: Workspace) => {
    const isActive = ws.id === activeWorkspaceId
    const isOwner = ws.ownerId === currentUserId
    const isSwitching = switchingId === ws.id

    return (
      <div
        key={ws.id}
        onClick={() => handleSwitch(ws.id)}
        className={`relative bg-slate-900/60 backdrop-blur-md border rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:border-amber-500/30 transition-all duration-300 flex items-center justify-between group cursor-pointer ${
          isActive ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-800"
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Workspace Initials Avatar */}
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-base font-black border shrink-0 transition-transform duration-300 group-hover:scale-105 ${
            isActive
              ? "bg-amber-500 text-slate-950 border-amber-500/20"
              : "bg-slate-800 text-amber-500 border-slate-700"
          }`}>
            {ws.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-200 truncate pr-2">
              {ws.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              {isOwner ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <ShieldCheck size={10} />
                  Owner
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  <User size={10} />
                  Member
                </span>
              )}

              {isActive && (
                <span className="inline-flex items-center text-[9px] font-black text-rose-455 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button / Loading */}
        <div className="shrink-0 pl-2 flex items-center gap-2">
          {!isOwner && (
            <Button
              size="xs"
              variant="outline"
              disabled={isPending}
              onClick={(e) => handleLeave(e, ws.id, ws.name)}
              className="border-red-900/50 hover:bg-red-500/10 text-red-400 cursor-pointer text-[10px] font-bold px-2.5 py-1 rounded-lg h-7"
            >
              {leavingId === ws.id ? (
                <Loader2 size={12} className="animate-spin text-red-400" />
              ) : (
                "Leave"
              )}
            </Button>
          )}



          {isSwitching ? (
            <Loader2 size={16} className="animate-spin text-amber-500" />
          ) : isActive ? (
            <span className="text-[11px] font-extrabold text-slate-400 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
              Open Board <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          ) : (
            <Button
              size="xs"
              variant="outline"
              className="border-amber-500/30 hover:bg-amber-500/10 text-amber-400 cursor-pointer text-[10px] font-bold px-2.5 py-1 rounded-lg h-7"
            >
              Switch
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto pr-1 scrollbar-thin">
      <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 select-none relative transition-all duration-300 pb-10 ${isPending ? "opacity-75 pointer-events-none filter blur-[0.3px]" : ""}`}>
        {/* Premium top linear loading bar showing sync state */}
        {isPending && typeof window !== "undefined" && createPortal(
          <div className="fixed top-14 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-yellow-500 z-40 overflow-hidden">
            <div className="h-full bg-amber-450 animate-pulse w-full" />
          </div>,
          document.body
        )}

        {/* Page Header */}
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-5">
          <h1 className="text-xl font-extrabold text-white tracking-tight sm:text-2xl flex items-center gap-2">
            <Briefcase size={22} className="text-amber-500" />
            <span>Workspaces Hub</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Manage, create, or switch between all workspaces you own or are part of.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center justify-between">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Owned Workspaces */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">
            Workspaces You Own
          </h2>
          {ownedWorkspaces.length === 0 ? (
            <p className="text-xs text-slate-500 italic pl-1">You don&apos;t own any workspaces yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownedWorkspaces.map(renderWorkspaceCard)}
            </div>
          )}
        </div>

        {/* Member Workspaces */}
        <div className="space-y-4 pt-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">
            Workspaces You Joined (as Member)
          </h2>
          {memberWorkspaces.length === 0 ? (
            <p className="text-xs text-slate-500 italic pl-1">No shared workspaces joined.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberWorkspaces.map(renderWorkspaceCard)}
            </div>
          )}
        </div>

        {/* Create Workspace Section */}
        {ownedWorkspaces.length === 0 && (
          <div className="border-t border-slate-800 pt-6 mt-4">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-200 mb-1">
                Create a New Workspace
              </h3>
              <p className="text-xs text-slate-400 mb-4 font-medium">
                Start a new dashboard for project tracking, board management, and team collaboration.
              </p>

              <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <Input
                  type="text"
                  placeholder="e.g. Acme Marketing, Alpha Team"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  disabled={isPending}
                  className="flex-1 bg-slate-955 border-slate-800 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-slate-200 text-xs font-medium rounded-xl h-10 px-3.5"
                />
                <Button
                  type="submit"
                  disabled={isPending || !newWorkspaceName.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black cursor-pointer shadow-3xs text-xs rounded-xl h-10 px-5 flex items-center justify-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-slate-950" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Create Workspace</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
        <DeleteConfirmModal
          isOpen={leaveWorkspaceId !== null}
          onClose={() => setLeaveWorkspaceId(null)}
          type="leave_workspace"
          name={leaveWorkspaceName}
          isPending={leavingId !== null}
          onConfirm={handleLeaveConfirm}
        />
        <DeleteConfirmModal
          isOpen={deleteWorkspaceId !== null}
          onClose={() => setDeleteWorkspaceId(null)}
          type="delete_workspace"
          name={deleteWorkspaceName}
          isPending={deletingId !== null}
          onConfirm={handleDeleteConfirm}
        />
        {switchingId !== null && <SwitchingWorkspaceLoading />}
      </div>
    </div>
  )
}
