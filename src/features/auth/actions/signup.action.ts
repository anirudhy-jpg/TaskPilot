"use server"

import { redirect } from "next/navigation"
import { AuthService } from "../services/auth.service"
import { SignupInput } from "../schemas/auth.schema"
import { OnboardingService } from "../services/onboarding.service"

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
    const { user } = await AuthService.signUp(input)
    if (user) {
      await OnboardingService.ensureUserOnboarded(user)
    }
    isSuccess = true
  } catch (error: unknown) {
    console.error("[Signup Action] Failed to signup or onboard user:", error)
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
