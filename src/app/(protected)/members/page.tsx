import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import {
  getCachedWorkspaceForUser,
  getCachedMembersByWorkspace,
  getCachedProjectsByWorkspace,
} from "@/lib/cached-requests"
import { InviteService } from "@/features/workspace/services/invite.service"
import { MembersList } from "@/features/workspace/components/members-list"

export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const { user } = await requireUser()

  const workspace = await getCachedWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  const [members, pendingInvitations, projects] = await Promise.all([
    getCachedMembersByWorkspace(workspace.id),
    InviteService.getPendingInvitations(workspace.id),
    getCachedProjectsByWorkspace(workspace.id, user.id, workspace.currentUserRole),
  ])

  const currentUserMemberRow = members.find(m => m.userId === user.id)
  const currentUserRole = currentUserMemberRow?.role || (workspace.ownerId === user.id ? "owner" : "member")
  const canInvite = currentUserRole !== "member"

  return (
    <MembersList
      workspaceId={workspace.id}
      members={members}
      pendingInvitations={pendingInvitations}
      canInvite={canInvite}
      currentUserRole={currentUserRole}
      currentUserId={user.id}
      projects={projects}
    />
  )
}
