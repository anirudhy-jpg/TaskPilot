import { createClient } from "@/lib/supabase/server"
import { UserProfile } from "../types/profile.types"

export class ProfileService {
  static async createProfile(
    id: string,
    email: string,
    fullName?: string
  ): Promise<UserProfile | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id,
        email,
        full_name: fullName || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating profile:", error)
      throw new Error(error.message)
    }

    if (!data) return null

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  /**
   * Idempotent profile creation.
   * Safe to call on every login — creates the row on first call,
   * silently skips if it already exists (ignoreDuplicates).
   */
  static async upsertProfile(
    id: string,
    email: string,
    fullName?: string | null,
    avatarUrl?: string | null
  ): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id,
          email,
          full_name: fullName ?? null,
          avatar_url: avatarUrl ?? null,
        },
        { onConflict: "id", ignoreDuplicates: true }
      )

    if (error) {
      console.error("Error upserting profile:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Backfill nullable fields on an existing profile
   * (e.g. avatar_url / full_name from GitHub metadata).
   * Only updates fields that are currently NULL to avoid
   * overwriting intentional user edits.
   */
  static async backfillProfileFromOAuth(
    id: string,
    fullName?: string | null,
    avatarUrl?: string | null
  ): Promise<void> {
    const supabase = await createClient()

    // Fetch existing values first to decide what to backfill
    const { data: existing } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", id)
      .maybeSingle()

    if (!existing) return

    const updates: Record<string, string | null> = {}
    if (!existing.full_name && fullName) updates.full_name = fullName
    if (!existing.avatar_url && avatarUrl) updates.avatar_url = avatarUrl

    if (Object.keys(updates).length === 0) return

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)

    if (error) {
      // Non-fatal — log and continue
      console.error("Error backfilling OAuth profile fields:", error)
    }
  }

  static async getProfile(id: string): Promise<UserProfile | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching profile:", error)
      throw new Error(error.message)
    }

    if (!data) return null

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }
}
