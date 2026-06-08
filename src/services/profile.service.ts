import { createClient } from "@/lib/supabase/server"
import { UserProfile } from "@/types/auth.types"

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
