"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfileAction(formData: FormData) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const fullName = formData.get("fullName") as string
    const avatarFile = formData.get("avatar") as File | null

    let avatarUrl: string | undefined

    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `${user.id}/${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) {
        console.error("Avatar upload error:", uploadError)
        return { success: false, error: "Failed to upload avatar. Ensure 'avatars' bucket exists and is public." }
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      avatarUrl = publicUrlData.publicUrl
    }

    const updates: { full_name?: string; avatar_url?: string } = {}
    if (fullName !== undefined) updates.full_name = fullName
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    }

    revalidatePath("/workspace")
    revalidatePath("/workspace/settings")
    
    return { success: true }
  } catch (error) {
    console.error("Update profile error:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." }
  }
}
