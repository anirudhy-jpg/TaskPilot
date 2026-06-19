"use server"

import { redirect } from "next/navigation"
import { AuthService } from "../services/auth.service"
import { LoginInput } from "../schemas/auth.schema"
import { OnboardingService } from "../services/onboarding.service"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function loginAction(
  input: LoginInput,
  redirectTo?: string | null
): Promise<ActionResponse> {
  let isSuccess = false
  try {
    const { user } = await AuthService.signIn(input)
    if (user) {
      await OnboardingService.ensureUserOnboarded(user)
    }
    isSuccess = true
  } catch (error: unknown) {
    console.error("[Login Action] Failed to login or onboard user:", error)
    const message = error instanceof Error ? error.message : "An unknown error occurred during sign in."
    return {
      success: false,
      error: message,
    }
  }

  if (isSuccess) {
    redirect(redirectTo || "/workspace")
  }

  return { success: false }
}
