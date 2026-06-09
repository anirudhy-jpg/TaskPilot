import React from "react"
import { requireUser } from "@/lib/supabase/server"
import { WorkspaceHubService } from "@/services/workspace-hub.service"
import { WorkspacesClient } from "@/components/workspace/WorkspacesClient"

export const dynamic = "force-dynamic"

export default async function WorkspacesPage() {
  const { user } = await requireUser()

  // Fetch all workspaces this user has access to
  const workspaces = await WorkspaceHubService.getWorkspacesForUser(user.id)

  // Get active workspace ID from cookie
  let activeWorkspaceId: string | null = null
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    activeWorkspaceId = cookieStore.get("active_workspace_id")?.value || null
  } catch {
    // ignore
  }

  // Fallback to first workspace if not set
  if (!activeWorkspaceId && workspaces.length > 0) {
    activeWorkspaceId = workspaces[0].id
  }

  return (
    <div className="max-w-4xl mx-auto py-4 px-2">
      <WorkspacesClient
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        currentUserId={user.id}
      />
    </div>
  )
}
