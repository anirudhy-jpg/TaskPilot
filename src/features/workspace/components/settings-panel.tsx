"use client"

import React, { useState, useTransition } from "react"
import { User, LogOut, Mail, Calendar, Shield, Lock, Lightbulb, DoorOpen, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/features/auth/actions/logout.action"
import { leaveWorkspaceAction } from "../actions/leave-workspace.action"
import { deleteWorkspaceAction } from "../actions/delete-workspace.action"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/features/auth/types/profile.types"
import { DeleteConfirmModal } from "./modals/delete-confirm-modal"

interface SettingsPanelProps {
  profile: UserProfile | null
  user: {
    id: string
    email?: string
    created_at?: string
    app_metadata?: { provider?: string }
  }
  isWorkspaceOwner?: boolean
  workspaceId?: string | null
  workspaceName?: string
}

export function SettingsPanel({
  profile,
  user,
  isWorkspaceOwner = true,
  workspaceId = null,
  workspaceName = "",
}: SettingsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const handleLeaveWorkspace = () => {
    setIsLeaveModalOpen(true)
  }

  const handleLeaveConfirm = () => {
    if (!workspaceId) return
    setErrorMsg(null)
    setIsLeaveModalOpen(false)
    startTransition(async () => {
      const res = await leaveWorkspaceAction(workspaceId)
      if (res.success) {
        router.push("/workspace")
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to leave workspace.")
      }
    })
  }

  const handleDeleteConfirm = () => {
    if (!workspaceId) return
    setErrorMsg(null)
    setIsDeleteModalOpen(false)
    startTransition(async () => {
      const res = await deleteWorkspaceAction(workspaceId)
      if (res.success) {
        router.push("/workspace")
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to delete workspace.")
      }
    })
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight sm:text-2xl">
            Settings
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your profile and account settings.
          </p>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6 pr-1 scrollbar-thin">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Profile and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-amber-550 mb-5">
              <User size={18} />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Profile Information</h3>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-white text-xl font-black shadow-md shadow-amber-555/15 uppercase">
                {profile?.fullName?.[0] ||
                  profile?.email?.[0] ||
                  user.email?.[0] ||
                  "?"}
              </div>
              <div>
                <p className="text-base font-bold text-slate-200">
                  {profile?.fullName || "Unknown User"}
                </p>
                <p className="text-xs text-slate-400">{profile?.email || user.email}</p>
              </div>
            </div>

            {/* Details */}
            <div className="divide-y divide-slate-800/80">
              <InfoRow
                icon={<Mail size={14} />}
                label="Email Address"
                value={user.email || "N/A"}
              />
              <InfoRow
                icon={<User size={14} />}
                label="Full Name"
                value={profile?.fullName || "Not set"}
              />
              <InfoRow
                icon={<Shield size={14} />}
                label="Auth Provider"
                value={user.app_metadata?.provider || "email"}
                capitalize
              />
              <InfoRow
                icon={<Calendar size={14} />}
                label="Account Created"
                value={
                  user.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"
                }
              />
              {profile?.updatedAt && (
                <InfoRow
                  icon={<Calendar size={14} />}
                  label="Profile Updated"
                  value={new Date(profile.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-center gap-2 text-red-400 mb-4">
                <LogOut size={18} />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Account Actions</h3>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                Sign out of your account. You will be redirected to the login page.
              </p>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer rounded-xl font-bold text-xs px-4 h-9 animate-all"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </Button>
              </form>
            </div>

            {!isWorkspaceOwner && workspaceId && (
              <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="flex items-center gap-2 text-red-400 mb-4">
                  <DoorOpen size={18} />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Workspace Actions</h3>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  Leave the current workspace "{workspaceName}". You will lose access to all its projects.
                </p>
                {errorMsg && <p className="text-xs text-red-400 mb-3">{errorMsg}</p>}
                <Button
                  onClick={handleLeaveWorkspace}
                  disabled={isPending}
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer rounded-xl font-bold text-xs px-4 h-9 animate-all"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Leaving...</span>
                    </>
                  ) : (
                    <>
                      <DoorOpen size={14} />
                      <span>Leave Workspace</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {isWorkspaceOwner && workspaceId && (
              <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 text-red-400 mb-4">
                  <Trash2 size={18} />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Workspace Actions</h3>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  Workspace owners are not permitted to delete workspaces.
                </p>
                <Button
                  disabled
                  variant="destructive"
                  size="sm"
                  className="cursor-not-allowed opacity-50 rounded-xl font-bold text-xs px-4 h-9"
                >
                  <Trash2 size={14} />
                  <span>Delete Workspace</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Pro-tips & Security */}
        <div className="space-y-6">
          {/* Pro Tips Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80">
            <div className="flex items-center gap-2 text-amber-550 mb-4">
              <Lightbulb size={18} />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Workspace Pro-Tips</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-3xs text-amber-500">💡</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Quick-Action Toolbar</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Hover over any card on the Kanban board to trigger the floating toolbar for instant status changes and deletion.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-3xs text-amber-500">👤</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Instant Assignments</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Assign members instantly by clicking the assignee avatar on any Kanban card or in the Task Details dialog.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-3xs text-teal-500">🛡️</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Owner Privileges</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Only the Workspace Owner can add or delete projects, invite new members, or manage active invitations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-200 mb-4">
              <Lock size={16} />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Security & Access</h3>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed mb-4">
              Your account is protected with enterprise-grade encryption. Here's a brief overview of your current access state:
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Session Status</span>
                <span className="text-amber-500 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide">Active</span>
              </div>
              <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Encryption</span>
                <span className="text-slate-300 font-bold">SSL / HTTPS</span>
              </div>
              <div className="flex items-center justify-between text-[11px] py-1">
                <span className="text-slate-400 font-medium">Primary Provider</span>
                <span className="text-slate-300 font-bold capitalize">{user.app_metadata?.provider || "email"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>

      <DeleteConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        type="leave_workspace"
        name={workspaceName}
        isPending={isPending}
        onConfirm={handleLeaveConfirm}
      />
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        type="delete_workspace"
        name={workspaceName}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

// ─── Sub-component ───────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  capitalize = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-550 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-400">{label}</span>
      </div>
      <span
        className={`text-xs font-bold text-slate-200 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
