import { useEffect } from "react"
import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable"
import { createClient } from "@/lib/supabase/client"
import type { WorkspaceMember, MemberRole } from "../types/workspace.types"
import { useRouter } from "next/navigation"

interface UseMembersRealtimeProps {
  workspaceId: string
  members: WorkspaceMember[]
  setMembers: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>
  currentUserId: string
}

/**
 * Hook to manage realtime updates for workspace members, handling profile fetching on insert
 * and membership eviction redirects.
 */
export function useMembersRealtime({
  workspaceId,
  members,
  setMembers,
  currentUserId,
}: UseMembersRealtimeProps) {
  const router = useRouter()

  useRealtimeSubscription({
    table: "workspace_members",
    filter: `workspace_id=eq.${workspaceId}`,
    onPayload: async (payload) => {
      const supabase = createClient()
      const { eventType, new: newRow, old: oldRow } = payload

      if (eventType === "INSERT") {
        // Fetch profile asynchronously on insert to display email/name/avatar
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name, avatar_url")
          .eq("id", newRow.user_id)
          .maybeSingle()

        const newMember: WorkspaceMember = {
          id: newRow.id,
          workspaceId: newRow.workspace_id,
          userId: newRow.user_id,
          role: newRow.role as MemberRole,
          joinedAt: newRow.joined_at,
          profile: profile
            ? {
                email: profile.email,
                fullName: profile.full_name,
                avatarUrl: profile.avatar_url,
              }
            : undefined,
        }

        setMembers((prev) => {
          const exists = prev.some((m) => m.id === newMember.id)
          if (exists) return prev
          return [...prev, newMember]
        })
      } else if (eventType === "UPDATE") {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === newRow.id
              ? {
                  ...m,
                  role: newRow.role as MemberRole,
                }
              : m
          )
        )
      } else if (eventType === "DELETE") {
        const deletedId = oldRow.id
        setMembers((prev) => {
          return prev.filter((m) => m.id !== deletedId)
        })
      }
    },
  })

  // Broadcast eviction listener
  useEffect(() => {
    if (!workspaceId) return
    const supabase = createClient()
    const channel = supabase.channel(`room:${workspaceId}`)

    channel
      .on("broadcast", { event: "evict" }, (response) => {
        const { memberId, userId } = response.payload || {}
        if (memberId || userId) {
          setMembers((prev) => {
            return prev.filter((m) => {
              if (memberId && m.id === memberId) return false
              if (userId && m.userId === userId) return false
              return true
            })
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, currentUserId, setMembers])
}
