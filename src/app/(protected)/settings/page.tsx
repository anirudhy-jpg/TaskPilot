import React from "react"
import { requireUser } from "@/lib/supabase/server"
import { ProfileService } from "@/services/profile.service"
import { SettingsPanel } from "@/components/workspace/SettingsPanel"

export default async function SettingsPage() {
  const { user } = await requireUser()

  let profile = null
  try {
    profile = await ProfileService.getProfile(user.id)
  } catch {
    // ignore
  }

  return (
    <SettingsPanel
      profile={profile}
      user={{
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        app_metadata: user.app_metadata,
      }}
    />
  )
}
