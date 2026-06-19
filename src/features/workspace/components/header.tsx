"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"

import { switchActiveWorkspaceAction } from "../actions/switch-active-workspace.action"
import { leaveWorkspaceAction } from "../actions/leave-workspace.action"
import { LogOut, DoorOpen, ChevronDown, Briefcase, Menu } from "lucide-react"
import type { UserProfile } from "@/features/auth/types/profile.types"
import type { Workspace } from "../types/workspace.types"
import { HeaderInbox } from "./header-inbox"
import { useRouter, usePathname } from "next/navigation"

import { LeaveWorkspaceConfirmModal } from "./modals/leave-workspace-confirm-modal"
import { SwitchWorkspaceModal } from "./modals/switch-workspace-modal"
import { SwitchingWorkspaceLoading } from "./switching-workspace-loading"
import { SignOutConfirmModal } from "@/features/auth/components/modals/signout-confirm-modal"

import { createClient } from "@/lib/supabase/client"

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
  onToggleSidebar?: () => void
}

export function Header({
  profile,
  user,
  isWorkspaceOwner = true,
  workspaceId = null,
  workspaceName = "",
  workspaces = [],
  currentUserId = "",
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false)
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false)
  const [isSignoutModalOpen, setIsSignoutModalOpen] = useState(false)

  const [prevRouteKey, setPrevRouteKey] = useState(`${workspaceId}:${pathname}`);

  if (`${workspaceId}:${pathname}` !== prevRouteKey) {
    setPrevRouteKey(`${workspaceId}:${pathname}`);
    setIsSwitchingWorkspace(false);
  }

  const handleLeaveConfirm = async () => {
    if (!workspaceId) return
    setIsLeaving(true)
    if (typeof window !== "undefined") {
      (window as { isLeavingWorkspace?: boolean }).isLeavingWorkspace = true
    }

    // Broadcast leave event to remove member instantly on owner/other clients
    try {
      const supabase = createClient()
      const channel = supabase.channel(`room:${workspaceId}`)
      await channel.subscribe(async (status) => {
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

    try {
      const res = await leaveWorkspaceAction(workspaceId)
      if (res.success) {
        setIsLeaveModalOpen(false)
        router.push("/workspace")
        router.refresh()
      } else {
        if (typeof window !== "undefined") {
          (window as { isLeavingWorkspace?: boolean }).isLeavingWorkspace = false
        }
        alert(res.error || "Failed to leave workspace.")
      }
    } catch {
      if (typeof window !== "undefined") {
        (window as { isLeavingWorkspace?: boolean }).isLeavingWorkspace = false
      }
      alert("An unexpected error occurred.")
    } finally {
      setIsLeaving(false)
    }
  }

  const handleSwitchWorkspace = async (targetId: string) => {
    setIsSwitchingWorkspace(true)
    const res = await switchActiveWorkspaceAction(targetId)
    if (res.success) {
      router.push("/workspace")
      router.refresh()
    } else {
      setIsSwitchingWorkspace(false)
      throw new Error(res.error || "Failed to switch workspace.")
    }
  }

  return (
    <header className="border-b border-slate-800 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50 w-full select-none text-white">
      <div className="w-full px-3 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 md:hidden text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Toggle Sidebar"
            >
              <Menu size={18} className="stroke-[2.5]" />
            </button>
          )}
          <Link href="/" className="cursor-pointer shrink-0">
            <Logo size="lg" className="hidden sm:flex" />
            <Logo size="lg" iconOnly className="flex sm:hidden" />
          </Link>
          {workspaceId && workspaces && workspaces.length > 1 && (
            <>
              <div className="h-4 w-px bg-slate-800 shrink-0" />
              <button
                onClick={() => setIsSwitchModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-200 transition-all cursor-pointer font-bold text-base shrink-0 select-none animate-in fade-in"
                title="Switch Workspace"
              >
                <Briefcase size={15} className="text-amber-500 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[140px]">{workspaceName}</span>
                <ChevronDown size={11} className="text-slate-400 shrink-0" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Notification Inbox Bell */}
          <HeaderInbox
            email={profile?.email || user.email}
            workspaceId={workspaceId}
            userId={currentUserId}
          />

          {/* User chip */}
          <div className="flex items-center gap-2.5 bg-slate-900/60 hover:bg-slate-900 px-3.5 py-2 rounded-full border border-slate-800 transition-all duration-300">
            <div className="w-7 h-7 rounded-full bg-amber-500 overflow-hidden flex items-center justify-center text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm select-none">
              {profile?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.fullName?.[0] ||
                profile?.email?.[0] ||
                user.email?.[0] ||
                "?"
              )}
            </div>
            <span className="text-base font-semibold text-slate-200 hidden sm:inline-block truncate max-w-[160px]">
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
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer rounded-full transition-colors w-8 h-8"
                title={`Leave workspace "${workspaceName}"`}
              >
                <DoorOpen size={15} className="stroke-[2.5]" />
              </Button>
              <LeaveWorkspaceConfirmModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                name={workspaceName}
                isPending={isLeaving}
                onConfirm={handleLeaveConfirm}
              />
            </>
          )}

          {/* Always show logout/signout button if owner or if not inside a workspace */}
          {(!workspaceId || isWorkspaceOwner) && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsSignoutModalOpen(true)}
                className="text-slate-400 hover:text-rose-455 hover:bg-rose-500/10 cursor-pointer rounded-full transition-colors w-8 h-8"
                title="Sign Out"
              >
                <LogOut size={15} className="stroke-[2.5]" />
              </Button>
              <SignOutConfirmModal 
                isOpen={isSignoutModalOpen} 
                onClose={() => setIsSignoutModalOpen(false)} 
              />
            </>
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
