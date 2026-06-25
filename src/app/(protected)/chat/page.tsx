import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { getCachedWorkspaceForUser, getCachedProfile } from "@/lib/cached-requests"
import { MessagesPage } from "@/features/messages/components/messages-page"
import { MessagingService } from "@/features/messages/services/messaging.service"

export const dynamic = "force-dynamic"

export default async function ChatPage() {
  const { user } = await requireUser()

  const workspace = await getCachedWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  const [profile, members, initialConversations] = await Promise.all([
    getCachedProfile(user.id).catch(() => null),
    MessagingService.getChateableMembers(workspace.id, user.id),
    MessagingService.getUserConversations(workspace.id, user.id),
  ]);

  return (
    <MessagesPage
      workspaceId={workspace.id}
      currentUserId={user.id}
      currentUserName={profile?.fullName || user.user_metadata?.full_name || user.email || 'Someone'}
      currentUserAvatarUrl={profile?.avatarUrl || user.user_metadata?.avatar_url || null}
      members={members}
      initialConversations={initialConversations}
    />
  )
}
