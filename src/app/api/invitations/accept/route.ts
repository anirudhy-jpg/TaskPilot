import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json({ error: "Missing invitation ID" }, { status: 400 })
    }

    // Step 1: Validate invitation exists, belongs to the user, and is pending
    const { data: invite, error: fetchErr } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("id", invitationId)
      .maybeSingle()

    if (fetchErr || !invite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `Invitation has already been ${invite.status}` }, { status: 400 })
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Your email does not match this invitation" }, { status: 403 })
    }

    // Step 2: Update invitation status to accepted
    const { error: updateErr } = await supabase
      .from("workspace_invitations")
      .update({ status: "accepted" })
      .eq("id", invite.id)

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update invitation status" }, { status: 500 })
    }

    // Step 2.5: Ensure user is added to workspace_members
    const { data: existingWorkspaceMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!existingWorkspaceMember) {
      const { error: wsMemberErr } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: invite.workspace_id,
          user_id: user.id,
          role: invite.role || "member"
        })

      if (wsMemberErr) {
        console.error("Error adding workspace member:", wsMemberErr)
      }
    }

    // Step 3: Add user to project_members with role = "member"
    if (invite.project_id) {
      const { data: existingProjMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", invite.project_id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (!existingProjMember) {
        // Try inserting. If RLS blocks it, remember the database trigger on_workspace_invitations_accepted
        // will automatically insert it via SECURITY DEFINER trigger.
        const { error: projMemberErr } = await supabase
          .from("project_members")
          .insert({
            project_id: invite.project_id,
            user_id: user.id,
            role: "member"
          })

        if (projMemberErr) {
          console.warn("Project member insertion skipped or handled by trigger:", projMemberErr.message)
        }
      }
    }

    // Set cookie for active workspace id so that they are redirected there on reload
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      cookieStore.set("active_workspace_id", invite.workspace_id, { path: "/" })
    } catch (cookieErr) {
      console.error("Failed to set active_workspace_id cookie in API:", cookieErr)
    }

    return NextResponse.json({ success: true, workspaceId: invite.workspace_id })
  } catch (err: any) {
    console.error("Accept invitation API error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
