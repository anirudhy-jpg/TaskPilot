"use server"

import { redirect } from "next/navigation"
import { AuthService } from "../services/auth.service"
import { SignupInput } from "../schemas/auth.schema"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function signupAction(
  input: SignupInput,
  redirectTo?: string | null
): Promise<ActionResponse> {
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
    redirect(redirectTo ? `/login?next=${encodeURIComponent(redirectTo)}` : "/login")
  }

  return { success: false }
}
