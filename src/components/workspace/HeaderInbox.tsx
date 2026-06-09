"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell, MailOpen, Check, X, Loader2, UserPlus, Shield } from "lucide-react"

interface InvitationNotification {
  id: string
  token: string
  projectName: string
  workspaceId: string
  invitedBy: string
  role: "admin" | "member"
}

export function HeaderInbox() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<InvitationNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 1. Establish SSE Connection
  useEffect(() => {
    const eventSource = new EventSource("/api/sse")

    eventSource.onmessage = (event) => {
      try {
        // Ignore ping messages
        if (event.data === "ping") return

        const data = JSON.parse(event.data)
        if (data.type === "invitation") {
          const newInvite: InvitationNotification = data.payload
          setInvitations((prev) => {
            // Avoid duplicates
            if (prev.some((inv) => inv.id === newInvite.id)) {
              return prev
            }
            return [newInvite, ...prev]
          })
        }
      } catch (err) {
        // Fail silently or log (pings may trigger empty parse errors if not filtered)
      }
    }

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error:", err)
      // EventSource automatically reconnects on error
    }

    return () => {
      eventSource.close()
    }
  }, [])

  // 2. Click Outside Handler
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

  // 3. Accept Invitation
  const handleAccept = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: id }),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        // Remove from local list
        setInvitations((prev) => prev.filter((inv) => inv.id !== id))
        setIsOpen(false)
        if (result.workspaceId) {
          router.push("/workspace")
          router.refresh()
        } else {
          router.refresh()
        }
      } else {
        alert(result.error || "Failed to accept invitation.")
      }
    } catch (err) {
      console.error("Error accepting invitation:", err)
      alert("An unexpected error occurred.")
    } finally {
      setProcessingId(null)
    }
  }

  // 4. Reject/Decline Invitation
  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch("/api/invitations/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: id }),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        // Remove from local list
        setInvitations((prev) => prev.filter((inv) => inv.id !== id))
        router.refresh()
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

  const pendingCount = invitations.length

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
        <div className="absolute right-0 mt-2.5 w-80 bg-white/95 backdrop-blur-xl border border-amber-900/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250 select-none">
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
                  You don&apos;t have any pending workspace invitations right now.
                </p>
              </div>
            ) : (
              invitations.map((invite) => {
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
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-450 capitalize px-2 py-0.5 rounded bg-white border border-slate-200">
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
