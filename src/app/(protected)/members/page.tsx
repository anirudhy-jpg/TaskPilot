import React from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceService } from "@/services/workspace.service"
import { MemberService } from "@/services/member.service"
import { MembersList } from "@/components/workspace/MembersList"

export default async function MembersPage() {
  const { user } = await requireUser()

  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  if (!workspace) redirect("/workspace")

  const members = await MemberService.getMembersByWorkspace(workspace.id)

  return <MembersList members={members} />
}
