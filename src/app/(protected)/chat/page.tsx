import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { getCachedWorkspaceForUser, getCachedProfile } from "@/lib/cached-requests"
import { MessagesPage } from "@/features/messages/components/messages-page"
import { MessagingService } from "@/features/messages/services/messaging.service"

export const dynamic = "force-dynamic"

export default async function ChatPage(props: { searchParams: Promise<{ userId?: string }> }) {
  const searchParams = await props.searchParams;
  const { user } = await requireUser()

  // We still need a workspace to exist (for the shell layout and storage paths),
  // but conversation loading is now workspace-independent.
  const workspace = await getCachedWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  const [profile, members, initialConversations] = await Promise.all([
    getCachedProfile(user.id).catch(() => null),
    // Global: all users sharing any workspace with the current user
    MessagingService.getChateableMembers(user.id),
    // Global: all conversations the current user is in, regardless of workspace
    MessagingService.getUserConversations(user.id),
  ]);

  return (
    <MessagesPage
      workspaceId={workspace.id}
      currentUserId={user.id}
      currentUserName={profile?.fullName || user.user_metadata?.full_name || user.email || 'Someone'}
      currentUserAvatarUrl={profile?.avatarUrl || user.user_metadata?.avatar_url || null}
      members={members}
      initialConversations={initialConversations}
      autoStartUserId={searchParams?.userId}
    />
  )
}
