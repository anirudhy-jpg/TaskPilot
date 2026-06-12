import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { MemberService } from "@/features/workspace/services/member.service"
import { InviteService } from "@/features/workspace/services/invite.service"
import { ProjectService } from "@/features/project/services/project.service"
import { MembersList } from "@/features/workspace/components/members-list"

export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspaces")

  const members = await MemberService.getMembersByWorkspace(workspace.id)
  const pendingInvitations = await InviteService.getPendingInvitations(workspace.id)
  const projects = await ProjectService.getProjectsByWorkspace(workspace.id)

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
