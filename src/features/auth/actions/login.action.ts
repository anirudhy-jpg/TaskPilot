"use server"

import { redirect } from "next/navigation"
import { AuthService } from "../services/auth.service"
import { LoginInput } from "../schemas/auth.schema"

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
    redirect(redirectTo || "/workspace")
  }

  return { success: false }
}
