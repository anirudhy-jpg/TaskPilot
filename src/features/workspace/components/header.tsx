"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/ui/logo"

import { switchActiveWorkspaceAction } from "../actions/switch-active-workspace.action"
import { leaveWorkspaceAction } from "../actions/leave-workspace.action"
import { LogOut, DoorOpen, ChevronDown, Briefcase, Menu, Settings } from "lucide-react"
import type { UserProfile } from "@/features/auth/types/profile.types"
import type { Workspace } from "../types/workspace.types"
import { HeaderInbox } from "./header-inbox"
import { useRouter } from "next/navigation"

import { LeaveWorkspaceConfirmModal } from "./modals/leave-workspace-confirm-modal"
import { SwitchWorkspaceModal } from "./modals/switch-workspace-modal"
import { SwitchingWorkspaceLoading } from "./switching-workspace-loading"
import { SignOutConfirmModal } from "@/features/auth/components/modals/signout-confirm-modal"
import { GlobalTimerWidget } from "@/features/time-tracking/components/GlobalTimerWidget"

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
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false)
  const [isSignoutModalOpen, setIsSignoutModalOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const [prevWorkspacesLength, setPrevWorkspacesLength] = useState(workspaces?.length || 0);

  if ((workspaces?.length || 0) !== prevWorkspacesLength) {
    setPrevWorkspacesLength(workspaces?.length || 0);
    if ((workspaces?.length || 0) <= 1) {
      setIsSwitchModalOpen(false);
    }
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

  const [isPendingSwitch, startTransition] = React.useTransition();

  const handleSwitchWorkspace = (targetId: string) => {
    setIsSwitchModalOpen(false) // Close the modal immediately so user isn't stuck
    
    startTransition(async () => {
      try {
        const res = await switchActiveWorkspaceAction(targetId)
        if (res.success) {
          router.push("/workspace")
          router.refresh()
        } else {
          alert(res.error || "Failed to switch workspace.")
        }
      } catch (err) {
        console.error("Failed to switch workspace", err)
      }
    })
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
          <GlobalTimerWidget />
          {/* Notification Inbox Bell */}
          <HeaderInbox
            email={profile?.email || user.email}
            workspaceId={workspaceId}
            userId={currentUserId}
          />

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2.5 bg-slate-900/60 hover:bg-slate-900 px-3.5 py-2 rounded-full border border-slate-800 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-700"
            >
              <div className="w-7 h-7 rounded-full bg-amber-500 overflow-hidden flex items-center justify-center text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm select-none shrink-0">
                {profile?.avatarUrl ? (
                  <Image src={profile.avatarUrl} alt="Avatar" width={28} height={28} className="w-full h-full object-cover" />
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
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 hidden sm:block ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-slate-800 sm:hidden">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {profile?.fullName || profile?.email || user.email}
                  </p>
                  {profile?.email && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{profile.email}</p>
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                >
                  <Settings size={15} className="text-slate-400" />
                  Settings
                </Link>
                
                {workspaceId && !isWorkspaceOwner && (
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false)
                      setIsLeaveModalOpen(true)
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left group"
                  >
                    <DoorOpen size={15} className="text-slate-400 group-hover:text-red-400 transition-colors" />
                    Leave Workspace
                  </button>
                )}

                <div className="h-px bg-slate-800 my-1" />

                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false)
                    setIsSignoutModalOpen(true)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                >
                  <LogOut size={15} className="text-rose-400" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <LeaveWorkspaceConfirmModal
            isOpen={isLeaveModalOpen}
            onClose={() => setIsLeaveModalOpen(false)}
            name={workspaceName}
            isPending={isLeaving}
            onConfirm={handleLeaveConfirm}
          />
          
          <SignOutConfirmModal 
            isOpen={isSignoutModalOpen} 
            onClose={() => setIsSignoutModalOpen(false)} 
          />
        </div>
      </div>
      <SwitchWorkspaceModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={workspaceId}
        currentUserId={currentUserId}
        onSwitchWorkspace={handleSwitchWorkspace as unknown as (id: string) => Promise<void>}
      />
      {isPendingSwitch && <SwitchingWorkspaceLoading />}
    </header>
  )
}
