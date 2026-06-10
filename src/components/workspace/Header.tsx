"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/actions/auth/auth.actions"
import { leaveWorkspaceAction, deleteWorkspaceAction, switchActiveWorkspaceAction } from "@/actions/workspace/workspace-hub.actions"
import { LogOut, DoorOpen, Trash2, ChevronDown, Briefcase } from "lucide-react"
import type { UserProfile } from "@/types/auth.types"
import type { Workspace } from "@/types/workspace.types"
import { HeaderInbox } from "@/components/workspace/HeaderInbox"
import { useRouter, usePathname } from "next/navigation"
import { DeleteConfirmModal } from "@/components/workspace/modals/DeleteConfirmModal"
import { SwitchWorkspaceModal } from "@/components/workspace/modals/SwitchWorkspaceModal"
import { SwitchingWorkspaceLoading } from "@/components/workspace/SwitchingWorkspaceLoading"

interface HeaderProps {
  profile: UserProfile | null
  user: {
    email?: string
    user_metadata?: {
      full_name?: string
      name?: string
    }
  }
  isWorkspaceOwner?: boolean
  workspaceId?: string | null
  workspaceName?: string
  workspaces?: Workspace[]
  currentUserId?: string
}

export function Header({
  profile,
  user,
  isWorkspaceOwner = true,
  workspaceId = null,
  workspaceName = "",
  workspaces = [],
  currentUserId = "",
}: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false)
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false)

  useEffect(() => {
    setIsSwitchingWorkspace(false)
  }, [workspaceId, pathname])

  const handleLeaveConfirm = async () => {
    if (!workspaceId) return
    setIsLeaving(true)
    try {
      const res = await leaveWorkspaceAction(workspaceId)
      if (res.success) {
        setIsLeaveModalOpen(false)
        window.location.href = "/workspace"
      } else {
        alert(res.error || "Failed to leave workspace.")
      }
    } catch {
      alert("An unexpected error occurred.")
    } finally {
      setIsLeaving(false)
    }
  }

  const handleSwitchWorkspace = async (targetId: string) => {
    setIsSwitchingWorkspace(true)
    const res = await switchActiveWorkspaceAction(targetId)
    if (res.success) {
      window.location.href = "/workspace"
    } else {
      setIsSwitchingWorkspace(false)
      throw new Error(res.error || "Failed to switch workspace.")
    }
  }

  return (
    <header className="border-b border-amber-900/10 bg-white/50 backdrop-blur-xl sticky top-0 z-50 w-full select-none">
      <div className="w-full px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="cursor-pointer shrink-0">
            <Logo size="md" />
          </Link>
          {workspaceId && workspaces && workspaces.length > 0 && (
            <>
              <div className="h-4 w-px bg-amber-900/15 shrink-0" />
              <button
                onClick={() => setIsSwitchModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-slate-800 transition-all cursor-pointer font-bold text-xs shrink-0 select-none animate-in fade-in"
                title="Switch Workspace"
              >
                <Briefcase size={12} className="text-amber-600 shrink-0" />
                <span className="truncate max-w-[120px]">{workspaceName}</span>
                <ChevronDown size={12} className="text-slate-500 shrink-0" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Inbox Bell */}
          <HeaderInbox />

          {/* User chip */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50/60 to-yellow-50/60 hover:from-amber-100/60 hover:to-yellow-100/60 px-3.5 py-1.5 rounded-full border border-amber-900/10 shadow-3xs transition-all duration-300">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              {profile?.fullName?.[0] ||
                profile?.email?.[0] ||
                user.email?.[0] ||
                "?"}
            </div>
            <span className="text-[11px] font-bold text-slate-700 hidden sm:inline-block truncate max-w-[150px]">
              {profile?.fullName || profile?.email || user.email}
            </span>
          </div>

          {/* Action: Delete Workspace (if owner) or Leave Workspace (if member) */}
          {workspaceId && !isWorkspaceOwner && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsLeaveModalOpen(true)}
                className="text-slate-550 hover:text-red-650 hover:bg-red-500/10 cursor-pointer rounded-full transition-colors w-8 h-8"
                title={`Leave workspace "${workspaceName}"`}
              >
                <DoorOpen size={15} className="stroke-[2.5]" />
              </Button>
              <DeleteConfirmModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                type="leave_workspace"
                name={workspaceName}
                isPending={isLeaving}
                onConfirm={handleLeaveConfirm}
              />
            </>
          )}

          {/* Always show logout/signout button if owner or if not inside a workspace */}
          {(!workspaceId || isWorkspaceOwner) && (
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-slate-550 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-full transition-colors w-8 h-8"
                title="Sign Out"
              >
                <LogOut size={15} className="stroke-[2.5]" />
              </Button>
            </form>
          )}
        </div>
      </div>
      <SwitchWorkspaceModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={workspaceId}
        currentUserId={currentUserId}
        onSwitchWorkspace={handleSwitchWorkspace}
      />
      {isSwitchingWorkspace && <SwitchingWorkspaceLoading />}
    </header>
  )
}
