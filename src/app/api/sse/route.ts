import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const email = user.email.toLowerCase()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection OK
      controller.enqueue(encoder.encode(": ok\n\n"))

      // Keep track of sent invitation IDs to avoid sending duplicates
      const sentInvitationIds = new Set<string>()

      const poll = async () => {
        try {
          const { data: invitations, error } = await supabase
            .from("workspace_invitations")
            .select(`
              id,
              workspace_id,
              project_id,
              email,
              invited_by,
              status,
              created_at,
              token,
              role,
              workspaces (name),
              projects (name),
              profiles:invited_by (full_name, email)
            `)
            .eq("email", email)
            .eq("status", "pending")

          if (error) {
            console.error("SSE Poll Error:", error)
            return
          }

          if (invitations) {
            for (const invite of invitations) {
              if (!sentInvitationIds.has(invite.id)) {
                sentInvitationIds.add(invite.id)

                const inviteProj = invite.projects as any
                const inviteWs = invite.workspaces as any
                const inviteProfile = invite.profiles as any

                const projectName = (Array.isArray(inviteProj) ? inviteProj[0]?.name : inviteProj?.name) ||
                                    (Array.isArray(inviteWs) ? inviteWs[0]?.name : inviteWs?.name) ||
                                    "Workspace Board"

                const invitedByName = Array.isArray(inviteProfile)
                  ? (inviteProfile[0]?.full_name || inviteProfile[0]?.email)
                  : (inviteProfile?.full_name || inviteProfile?.email)

                const payload = {
                  id: invite.id,
                  token: invite.token,
                  projectName,
                  workspaceId: invite.workspace_id,
                  invitedBy: invitedByName || "Admin",
                  role: invite.role
                }

                const sseMessage = `data: ${JSON.stringify({
                  type: "invitation",
                  payload
                })}\n\n`
                if (!req.signal.aborted) {
                  try {
                    controller.enqueue(encoder.encode(sseMessage))
                  } catch (err) {
                    clearInterval(interval)
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Error in SSE poll execution:", err)
        }
      }

      // Initial query
      if (!req.signal.aborted) {
        await poll()
      }

      // Set up polling interval every 5 seconds
      const interval = setInterval(async () => {
        if (req.signal.aborted) {
          clearInterval(interval)
          return
        }
        await poll()
        if (req.signal.aborted) {
          clearInterval(interval)
          return
        }
        // Send a ping to keep connection alive
        try {
          controller.enqueue(encoder.encode(": ping\n\n"))
        } catch (err) {
          clearInterval(interval)
        }
      }, 5000)

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch (err) {
          // Stream might be closed already
        }
      })
    }
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    }
  })
}
