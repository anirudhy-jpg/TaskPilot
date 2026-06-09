"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/actions/auth/auth.actions"
import { leaveWorkspaceAction, deleteWorkspaceAction } from "@/actions/workspace/workspace-hub.actions"
import { LogOut, DoorOpen, Trash2 } from "lucide-react"
import type { UserProfile } from "@/types/auth.types"
import { HeaderInbox } from "@/components/workspace/HeaderInbox"
import { useRouter } from "next/navigation"
import { DeleteConfirmModal } from "@/components/workspace/modals/DeleteConfirmModal"

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
}

export function Header({
  profile,
  user,
  isWorkspaceOwner = true,
  workspaceId = null,
  workspaceName = "",
}: HeaderProps) {
  const router = useRouter()
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleLeaveConfirm = async () => {
    if (!workspaceId) return
    setIsLeaving(true)
    try {
      const res = await leaveWorkspaceAction(workspaceId)
      if (res.success) {
        setIsLeaveModalOpen(false)
        router.push("/workspace")
        router.refresh()
      } else {
        alert(res.error || "Failed to leave workspace.")
      }
    } catch {
      alert("An unexpected error occurred.")
    } finally {
      setIsLeaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!workspaceId) return
    setIsDeleting(true)
    try {
      const res = await deleteWorkspaceAction(workspaceId)
      if (res.success) {
        setIsDeleteModalOpen(false)
        router.push("/workspace")
        router.refresh()
      } else {
        alert(res.error || "Failed to delete workspace.")
      }
    } catch {
      alert("An unexpected error occurred.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <header className="border-b border-amber-900/10 bg-white/50 backdrop-blur-xl sticky top-0 z-50 w-full select-none">
      <div className="w-full px-6 h-14 flex items-center justify-between">
        <Link href="/" className="cursor-pointer">
          <Logo size="md" />
        </Link>

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
          {workspaceId && (
            isWorkspaceOwner ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-slate-550 hover:text-red-650 hover:bg-red-500/10 cursor-pointer rounded-full transition-colors w-8 h-8"
                  title={`Delete workspace "${workspaceName}"`}
                >
                  <Trash2 size={15} className="stroke-[2.5]" />
                </Button>
                <DeleteConfirmModal
                  isOpen={isDeleteModalOpen}
                  onClose={() => setIsDeleteModalOpen(false)}
                  type="delete_workspace"
                  name={workspaceName}
                  isPending={isDeleting}
                  onConfirm={handleDeleteConfirm}
                />
              </>
            ) : (
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
            )
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
    </header>
  )
}
