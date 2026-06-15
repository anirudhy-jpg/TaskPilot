"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Bell, MailOpen, Check, X, Loader2, UserPlus, Shield, UserMinus } from "lucide-react"
import { SwitchingWorkspaceLoading } from "./switching-workspace-loading"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable"

import { acceptInvitationAction } from "@/features/workspace/actions/accept-invitation.action"
import { declineInvitationAction } from "@/features/workspace/actions/decline-invitation.action"
import { dismissNotificationAction } from "@/features/workspace/actions/dismiss-notification.action"
import { markAllNotificationsAsReadAction } from "@/features/workspace/actions/mark-all-notifications-read.action"

interface InvitationNotification {
  id: string
  token: string
  projectName: string
  workspaceId: string
  invitedBy: string
  role: "admin" | "member"
}

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
  workspaceId?: string
  actorId?: string | null
}

interface HeaderInboxProps {
  email?: string | null
  workspaceId?: string | null
  userId?: string | null
}

export function HeaderInbox({ email, workspaceId, userId }: HeaderInboxProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [invitations, setInvitations] = useState<InvitationNotification[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Reset switching loading screen on route or workspace changes
  useEffect(() => {
    setIsSwitching(false)
  }, [pathname, workspaceId])

  // Fetch initial invitations & notifications client-side
  useEffect(() => {
    if (!email) return
    const fetchInitialInvitations = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("workspace_invitations")
        .select(`
          id,
          workspace_id,
          project_id,
          email,
          invited_by,
          status,
          created_at,
          token,
          role,
          workspaces (name),
          projects (name),
          profiles:invited_by (full_name, email)
        `)
        .eq("email", email.toLowerCase())
        .eq("status", "pending")

      if (error) {
        console.error("Error fetching invitations:", error)
        return
      }

      if (data) {
        const mapped = data.map((invite: any) => {
          const inviteProj = invite.projects
          const inviteWs = invite.workspaces
          const inviteProfile = invite.profiles

          const projectName = (Array.isArray(inviteProj) ? inviteProj[0]?.name : inviteProj?.name) ||
                              (Array.isArray(inviteWs) ? inviteWs[0]?.name : inviteWs?.name) ||
                              "Workspace Board"

          const invitedByName = Array.isArray(inviteProfile)
            ? (inviteProfile[0]?.full_name || inviteProfile[0]?.email)
            : (inviteProfile?.full_name || inviteProfile?.email)

          return {
            id: invite.id,
            token: invite.token,
            projectName,
            workspaceId: invite.workspace_id,
            invitedBy: invitedByName || "Admin",
            role: invite.role,
          }
        })
        setInvitations(mapped)
      }
    }

    const fetchInitialNotifications = async () => {
      if (!userId) return
      const supabase = createClient()
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, created_at, workspace_id, actor_id")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching notifications:", error)
        return
      }

      if (data) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          createdAt: item.created_at,
          workspaceId: item.workspace_id,
          actorId: item.actor_id,
        }))
        setNotifications(mapped)
      }
    }

    fetchInitialInvitations()
    fetchInitialNotifications()
  }, [email, userId])

  // Subscribe to workspace_invitations table for the current user's email
  useRealtimeSubscription({
    table: "workspace_invitations",
    filter: email ? `email=eq.${email.toLowerCase()}` : undefined,
    onPayload: async (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload
      const supabase = createClient()

      if (eventType === "INSERT") {
        const { data: invite } = await supabase
          .from("workspace_invitations")
          .select(`
            id,
            workspace_id,
            project_id,
            email,
            invited_by,
            status,
            created_at,
            token,
            role,
            workspaces (name),
            projects (name),
            profiles:invited_by (full_name, email)
          `)
          .eq("id", newRow.id)
          .maybeSingle()

        if (invite) {
          const rawInvite = invite as any
          const inviteProj = rawInvite.projects
          const inviteWs = rawInvite.workspaces
          const inviteProfile = rawInvite.profiles

          const projectName = (Array.isArray(inviteProj) ? inviteProj[0]?.name : inviteProj?.name) ||
                              (Array.isArray(inviteWs) ? inviteWs[0]?.name : inviteWs?.name) ||
                              "Workspace Board"

          const invitedByName = Array.isArray(inviteProfile)
            ? (inviteProfile[0]?.full_name || inviteProfile[0]?.email)
            : (inviteProfile?.full_name || inviteProfile?.email)

          const newInvite: InvitationNotification = {
            id: rawInvite.id,
            token: rawInvite.token,
            projectName,
            workspaceId: rawInvite.workspace_id,
            invitedBy: invitedByName || "Admin",
            role: rawInvite.role,
          }

          setInvitations((prev) => {
            if (prev.some((inv) => inv.id === newInvite.id)) return prev
            return [newInvite, ...prev]
          })
        }
      } else if (eventType === "UPDATE") {
        if (newRow.status !== "pending") {
          setInvitations((prev) => prev.filter((inv) => inv.id !== newRow.id))
        }
      } else if (eventType === "DELETE") {
        setInvitations((prev) => prev.filter((inv) => inv.id !== oldRow.id))
      }
    },
  })

  // Subscribe to notifications table for real-time inbox updates
  useRealtimeSubscription({
    table: "notifications",
    onPayload: async (payload) => {
      console.log("[HeaderInbox] Realtime notification event received:", payload)
      const { eventType, new: newRow, old: oldRow } = payload

      if (eventType === "INSERT") {
        if (newRow.read === false && (!userId || newRow.user_id === userId)) {
          const newNotif: NotificationItem = {
            id: newRow.id,
            title: newRow.title,
            message: newRow.message,
            type: newRow.type,
            createdAt: newRow.created_at,
            workspaceId: newRow.workspace_id,
            actorId: newRow.actor_id,
          }
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev
            return [newNotif, ...prev]
          })
        }
      } else if (eventType === "UPDATE") {
        if (newRow.read === true) {
          setNotifications((prev) => prev.filter((n) => n.id !== newRow.id))
        }
      } else if (eventType === "DELETE") {
        setNotifications((prev) => prev.filter((n) => n.id !== oldRow.id))
      }
    },
  })

  // Click Outside Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Mark all notifications as read and clear local state when the dropdown is closed
  const prevIsOpenRef = useRef(isOpen)
  useEffect(() => {
    if (!isOpen && prevIsOpenRef.current === true) {
      if (notifications.length > 0) {
        markAllNotificationsAsReadAction().catch((err) =>
          console.error("Failed to mark notifications as read:", err)
        )
      }
      setNotifications([])
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, notifications.length])

  // Accept Invitation
  const handleAccept = async (id: string) => {
    const invite = invitations.find((inv) => inv.id === id)
    if (!invite) return
    setProcessingId(id)
    try {
      const result = await acceptInvitationAction(invite.token)

      if (result.success) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== id))
        setIsOpen(false)
        if (result.data) {
          if (result.data !== workspaceId) {
            setIsSwitching(true)
            router.push("/workspace")
            router.refresh()
          } else {
            router.refresh()
            setProcessingId(null)
          }
        } else {
          router.refresh()
          setProcessingId(null)
        }
      } else {
        alert(result.error || "Failed to accept invitation.")
        setProcessingId(null)
      }
    } catch (err) {
      console.error("Error accepting invitation:", err)
      alert("An unexpected error occurred.")
      setProcessingId(null)
    }
  }

  // Reject/Decline Invitation
  const handleReject = async (id: string) => {
    const invite = invitations.find((inv) => inv.id === id)
    if (!invite) return
    setProcessingId(id)
    try {
      const result = await declineInvitationAction(invite.token)

      if (result.success) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== id))
      } else {
        alert(result.error || "Failed to reject invitation.")
      }
    } catch (err) {
      console.error("Error rejecting invitation:", err)
      alert("An unexpected error occurred.")
    } finally {
      setProcessingId(null)
    }
  }

  // Dismiss Notification
  const handleDismissNotification = async (id: string) => {
    setProcessingId(id)
    try {
      const result = await dismissNotificationAction(id)
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      } else {
        alert(result.error || "Failed to dismiss notification.")
      }
    } catch (err) {
      console.error("Error dismissing notification:", err)
      alert("An unexpected error occurred.")
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = invitations.length + notifications.length

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full border transition-all duration-300 cursor-pointer ${
          isOpen
            ? "bg-amber-50 border-amber-500/30 text-amber-600 shadow-sm"
            : "border-amber-900/10 hover:border-amber-500/20 hover:bg-amber-50/50 text-slate-500 hover:text-slate-800"
        }`}
        title="Inbox Notifications"
      >
        <Bell size={16} className="stroke-[2.2]" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white animate-bounce shadow-sm">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto mt-2.5 w-auto sm:w-80 bg-white/95 backdrop-blur-xl border border-amber-900/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250 select-none">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 border-b border-amber-900/5 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800">Inbox Notifications</span>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-amber-955/5 scrollbar-thin">
            {pendingCount === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                  <MailOpen size={16} />
                </div>
                <div className="text-xs font-bold text-slate-700">All caught up!</div>
                <p className="text-[10px] text-slate-400 max-w-[180px] leading-normal">
                  You don&apos;t have any pending notifications right now.
                </p>
              </div>
            ) : (
              <>
                {/* Invitations */}
                {invitations.map((invite) => {
                  const isProcessing = processingId === invite.id
                  return (
                    <div key={invite.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-3">
                      {/* Inviter Info */}
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                          <UserPlus size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-550 leading-normal">
                            <span className="font-extrabold text-slate-800">{invite.invitedBy}</span> invited you to join
                          </p>
                          <p className="text-xs font-black text-slate-850 truncate mt-0.5" title={invite.projectName}>
                            {invite.projectName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-455 capitalize px-2 py-0.5 rounded bg-white border border-slate-200">
                              {invite.role === "admin" && <Shield size={9} className="text-blue-500" />}
                              {invite.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAccept(invite.id)}
                          disabled={isProcessing}
                          className="flex-1 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black transition-all duration-150 flex items-center justify-center gap-1 shadow-3xs hover:shadow-2xs active:scale-[0.97] cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 size={11} className="animate-spin text-slate-950" />
                          ) : (
                            <Check size={12} className="stroke-[2.5]" />
                          )}
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(invite.id)}
                          disabled={isProcessing}
                          className="flex-1 h-8 rounded-lg border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-550 hover:text-slate-800 text-[10px] font-bold transition-all duration-150 flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer disabled:opacity-50"
                        >
                          <X size={12} className="stroke-[2.5]" />
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* General Notifications */}
                {notifications.map((notif) => {
                  const isProcessing = processingId === notif.id
                  
                  // Style notifications by type:
                  // - invitation_accepted: green (Accept)
                  // - invitation_rejected: red (Reject)
                  // - member_left: red (Leave)
                  let colorClass = "bg-amber-500/10 text-amber-600"
                  let icon = <Bell size={14} />

                  if (notif.type === "invitation_accepted") {
                    colorClass = "bg-emerald-500/10 text-emerald-600"
                    icon = <Check size={14} className="stroke-[2.5]" />
                  } else if (notif.type === "invitation_rejected") {
                    colorClass = "bg-rose-500/10 text-rose-600"
                    icon = <X size={14} className="stroke-[2.5]" />
                  } else if (notif.type === "member_left") {
                    colorClass = "bg-rose-500/10 text-rose-600"
                    icon = <UserMinus size={14} />
                  }

                  return (
                    <div key={notif.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold uppercase shrink-0`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 leading-normal">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-550 leading-relaxed mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => handleDismissNotification(notif.id)}
                          disabled={isProcessing}
                          className="px-3 h-7 rounded-lg border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-550 hover:text-slate-800 text-[10px] font-bold transition-all duration-150 flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 size={10} className="animate-spin text-slate-550" />
                          ) : (
                            <Check size={11} className="stroke-[2.5]" />
                          )}
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
      {isSwitching && <SwitchingWorkspaceLoading />}
    </div>
  )
}