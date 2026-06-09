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

    // Validate invitation exists, belongs to the user, and is pending
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

    // Update invitation status to declined
    const { error: updateErr } = await supabase
      .from("workspace_invitations")
      .update({ status: "declined" })
      .eq("id", invite.id)

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update invitation status" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Reject invitation API error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
