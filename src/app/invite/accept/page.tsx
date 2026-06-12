import React from "react"
import { getSession } from "@/lib/supabase/server"
import { InviteService } from "@/features/workspace/services/invite.service"
import { AcceptInviteClient } from "@/features/workspace/components/accept-invite-client"
import { AuthLayout } from "@/features/auth/components/auth-layout"
import { AlertTriangle, Clock } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams
  const { user } = await getSession()

  let details = null
  let errorMsg = null
  let isExpired = false

  if (!token) {
    errorMsg = "Invalid invitation link. No token provided."
  } else {
    try {
      details = await InviteService.getInvitationByToken(token)
      if (!details) {
        errorMsg = "Invitation not found. Please ask your administrator to send another link."
      } else {
        const { invitation } = details
        if (invitation.status !== "pending") {
          errorMsg = `This invitation has already been ${invitation.status}.`
        } else if (new Date(invitation.expiresAt) < new Date()) {
          errorMsg = "This invitation has expired. Invitations are valid for 7 days."
          isExpired = true
        }
      }
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : "Failed to load invitation details."
    }
  }

  return (
    <AuthLayout>
      <div className="w-full bg-white border border-slate-200 rounded-xl p-6 md:p-8 flex flex-col items-stretch shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
        <div className="mb-4 text-center">
          <h2 className="text-slate-900 text-lg font-bold">Workspace Invitation</h2>
        </div>

        {errorMsg ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-650">
              {isExpired ? <Clock size={22} className="text-red-500" /> : <AlertTriangle size={22} className="text-red-500" />}
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {errorMsg}
            </p>
          </div>
        ) : details ? (
          <AcceptInviteClient
            token={token!}
            workspaceName={details.workspaceName}
            inviterName={details.inviterName}
            role={details.invitation.role}
            email={details.invitation.email}
            currentUserEmail={user?.email || null}
            projectName={details.projectName}
          />
        ) : null}
      </div>
    </AuthLayout>
  )
}
