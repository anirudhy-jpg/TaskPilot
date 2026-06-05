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
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unknown error occurred during sign in.",
    }
  }

  if (isSuccess) {
    redirect("/dashboard")
  }

  return { success: false }
}

export async function signupAction(input: SignupInput): Promise<ActionResponse> {
  let isSuccess = false
  try {
    await AuthService.signUp(input)
    isSuccess = true
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unknown error occurred during sign up.",
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
  } catch (error: any) {
    console.error("Signout error:", error)
  }

  if (isSuccess) {
    redirect("/login")
  }
}
