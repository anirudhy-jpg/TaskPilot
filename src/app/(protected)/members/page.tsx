import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/services/workspace.service"
import { MemberService } from "@/services/member.service"
import { InviteService } from "@/services/invite.service"
import { ProjectService } from "@/services/project.service"
import { MembersList } from "@/components/workspace/MembersList"

export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspace/new")

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
