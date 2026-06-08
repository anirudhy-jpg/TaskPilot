"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { acceptInvitationAction, declineInvitationAction } from "@/actions/invite.actions"
import { Shield, User, LogIn, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AcceptInviteClientProps {
  token: string
  workspaceName: string
  inviterName: string
  role: "admin" | "member"
  email: string
  currentUserEmail: string | null
}

export function AcceptInviteClient({
  token,
  workspaceName,
  inviterName,
  role,
  email,
  currentUserEmail,
}: AcceptInviteClientProps) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<"accept" | "decline" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 1. If user is not logged in, show login prompt
  if (!currentUserEmail) {
    return (
      <div className="text-center space-y-6 py-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-600">
          <LogIn size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-900">Sign in to Join</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            You&apos;ve been invited to join <span className="font-semibold text-slate-800">{workspaceName}</span>. Please sign in or create an account to accept the invitation.
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => router.push(`/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`)}
            className="w-full max-w-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Continue to Login
          </Button>
        </div>
      </div>
    )
  }

  // 2. If user email does not match invitation email
  if (currentUserEmail.toLowerCase() !== email.toLowerCase()) {
    return (
      <div className="text-center space-y-6 py-6">
        <div className="w-16 h-16 rounded-full bg-amber-550/10 flex items-center justify-center mx-auto text-amber-600">
          <XCircle size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-900">Email Mismatch</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            This invitation was sent to <span className="font-semibold text-slate-800">{email}</span>, but you are logged in as <span className="font-semibold text-slate-800">{currentUserEmail}</span>.
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Please log out and sign in with the correct email to accept this invitation.
          </p>
        </div>
        <div className="pt-4 flex flex-col gap-2 max-w-xs mx-auto">
          <Button
            variant="outline"
            onClick={async () => {
              // Sign out and redirect
              await fetch("/auth/signout", { method: "POST" })
              router.push("/login")
            }}
            className="w-full text-slate-650 hover:text-slate-850 hover:bg-slate-50 border-slate-200 cursor-pointer rounded-xl py-2"
          >
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  // 3. If invitation was declined successfully
  if (successMessage) {
    return (
      <div className="text-center space-y-6 py-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto text-green-600">
          <CheckCircle2 size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-900">Invitation Declined</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            {successMessage}
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => router.push("/")}
            className="w-full max-w-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  const handleAccept = async () => {
    setLoadingAction("accept")
    setError(null)
    try {
      const res = await acceptInvitationAction(token)
      if (res.success && res.data) {
        // Redirect to workspace dashboard
        router.push("/workspace")
        router.refresh()
      } else {
        setError(res.error || "Failed to accept invitation.")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDecline = async () => {
    setLoadingAction("decline")
    setError(null)
    try {
      const res = await declineInvitationAction(token)
      if (res.success) {
        setSuccessMessage("You have successfully declined the invitation.")
      } else {
        setError(res.error || "Failed to decline invitation.")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-600 font-extrabold text-xl uppercase">
          {workspaceName[0]}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-900">{workspaceName}</h3>
          <p className="text-xs text-slate-500">
            Invited by <span className="font-semibold text-slate-700">{inviterName}</span>
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {role === "admin" ? (
            <Shield size={16} className="text-blue-650" />
          ) : (
            <User size={16} className="text-slate-500" />
          )}
          <span className="text-xs font-semibold text-slate-650">Invited Role</span>
        </div>
        <span className="text-xs font-bold text-slate-900 capitalize px-2 py-1 rounded bg-white border border-slate-200">
          {role}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3 text-center font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button
          onClick={handleAccept}
          disabled={loadingAction !== null}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 h-11 cursor-pointer text-sm"
        >
          {loadingAction === "accept" ? (
            <>
              <Loader2 size={16} className="animate-spin text-slate-950" />
              Accepting...
            </>
          ) : (
            "Accept Invitation"
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDecline}
          disabled={loadingAction !== null}
          className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium py-2 rounded-xl transition-colors h-10 cursor-pointer text-xs"
        >
          {loadingAction === "decline" ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Declining...
            </>
          ) : (
            "Decline"
          )}
        </Button>
      </div>
    </div>
  )
}
