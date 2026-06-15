import { useRealtimeList } from "@/lib/realtime/subscribeToTable"
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
  let filter: string | undefined = undefined
  if (workspaceId) {
    filter = `workspace_id=eq.${workspaceId}`
  } else if (email) {
    filter = `email=eq.${email}`
  }

  useRealtimeList<Invitation>(
    invitations,
    setInvitations,
    {
      table: "workspace_invitations",
      filter,
      mapRow: mapRealtimeInvitation,
    },
    {
      onUpdate: (updatedItem) => {
        if (updatedItem.status !== "pending") {
          setInvitations((prev) => prev.filter((inv) => inv.id !== updatedItem.id))
        }
      },
    }
  )
}
