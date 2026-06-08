"use server"

import { redirect } from "next/navigation"
import { AuthService } from "@/services/auth.service"
import { SignupInput, LoginInput } from "@/validation/auth.validation"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function loginAction(input: LoginInput): Promise<ActionResponse> {
  let isSuccess = false
  try {
    await AuthService.signIn(input)
    isSuccess = true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred during sign in."
    return {
      success: false,
      error: message,
    }
  }

  if (isSuccess) {
    redirect("/workspace")
  }

  return { success: false }
}

export async function signupAction(input: SignupInput): Promise<ActionResponse> {
  let isSuccess = false
  try {
    await AuthService.signUp(input)
    isSuccess = true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred during sign up."
    return {
      success: false,
      error: message,
    }
  }

  if (isSuccess) {
    redirect("/login")
  }

  return { success: false }
}

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
