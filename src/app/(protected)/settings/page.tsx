import React from "react"
import { requireUser } from "@/lib/supabase/server"
import { ProfileService } from "@/features/auth/services/profile.service"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { SettingsPanel } from "@/features/workspace/components/settings-panel"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const { user } = await requireUser()

  let profile = null
  try {
    profile = await ProfileService.getProfile(user.id)
  } catch {
    // ignore
  }

  // Get active workspace details
  const workspace = await WorkspaceService.getWorkspaceForUser(user.id)
  const isWorkspaceOwner = workspace ? workspace.ownerId === user.id : true
  const workspaceId = workspace ? workspace.id : null
  const workspaceName = workspace ? workspace.name : ""

  console.log("=== DEBUG SETTINGS ===")
  console.log("User ID:", user.id)
  console.log("Active Workspace:", workspace)
  console.log("Is Owner:", isWorkspaceOwner)
  console.log("======================")

  return (
    <SettingsPanel
      profile={profile}
      user={{
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        app_metadata: user.app_metadata,
      }}
      isWorkspaceOwner={isWorkspaceOwner}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
    />
  )
}
