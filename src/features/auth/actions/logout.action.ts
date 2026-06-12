"use server"

import { redirect } from "next/navigation"
import { AuthService } from "../services/auth.service"

export async function logoutAction(): Promise<void> {
  let isSuccess = false
  try {
    await AuthService.signOut()
    isSuccess = true
  } catch (error: unknown) {
    console.error("Signout error:", error)
  }

  if (isSuccess) {
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      cookieStore.delete("active_workspace_id")
    } catch (cookieErr) {
      console.error("Failed to delete active_workspace_id cookie:", cookieErr)
    }
    redirect("/login")
  }
}
