import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable"
import type { Invitation } from "../services/invite.service"

/**
 * Maps a raw Supabase invitations row to the Invitation type.
 */
export function mapRealtimeInvitation(row: Record<string, any>): Invitation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role as "admin" | "member",
    token: row.token,
    status: row.status as "pending" | "accepted" | "declined",
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    projectId: row.project_id || null,
    projectIds: row.project_ids || (row.project_id ? [row.project_id] : []),
  }
}

interface UseInvitationsRealtimeProps {
  workspaceId?: string | null
  email?: string | null
  invitations: Invitation[]
  setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>
}

/**
 * Hook to manage invitations in realtime, supporting either workspace-scoped filtering (for admins)
 * or email-scoped filtering (for user notification inboxes).
 */
export function useInvitationsRealtime({
  workspaceId,
  email,
  invitations,
  setInvitations,
}: UseInvitationsRealtimeProps) {
  useRealtimeSubscription({
    table: "workspace_invitations",
    filter: undefined,
    onPayload: (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload
      if (eventType === "INSERT" && newRow) {
        const isMatch = workspaceId
          ? newRow.workspace_id === workspaceId
          : email
          ? newRow.email?.toLowerCase() === email.toLowerCase()
          : false
        if (isMatch) {
          const mapped = mapRealtimeInvitation(newRow)
          setInvitations((prev) => {
            const exists = prev.some((inv) => inv.id === mapped.id)
            if (exists) return prev
            return [...prev, mapped]
          })
        }
      } else if (eventType === "UPDATE" && newRow) {
        const isMatch = workspaceId
          ? newRow.workspace_id === workspaceId
          : email
          ? newRow.email?.toLowerCase() === email.toLowerCase()
          : false
        if (isMatch) {
          const mapped = mapRealtimeInvitation(newRow)
          setInvitations((prev) => {
            const exists = prev.some((inv) => inv.id === mapped.id)
            if (!exists) {
              if (mapped.status === "pending") {
                return [...prev, mapped]
              }
              return prev
            }
            if (mapped.status !== "pending") {
              return prev.filter((inv) => inv.id !== mapped.id)
            }
            return prev.map((inv) => (inv.id === mapped.id ? mapped : inv))
          })
        } else {
          setInvitations((prev) => prev.filter((inv) => inv.id !== newRow.id))
        }
      } else if (eventType === "DELETE" && oldRow) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== oldRow.id))
      }
    },
  })
}
