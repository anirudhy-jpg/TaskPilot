import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { OnboardingService } from "@/features/auth/services/onboarding.service"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/workspace"

  if (code) {
    const supabase = await createClient()
    const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeErr) {
      // Use getUser (server-verified) rather than trusting the JWT session alone.
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) {
        console.error("[Callback] Could not retrieve user after code exchange:", userErr)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
      }

      try {
        // Guarantee profile → workspace → workspace_members before entering the app.
        // This is idempotent: safe to run on every login, prevents duplicate rows.
        await OnboardingService.ensureUserOnboarded(user)
      } catch (onboardingErr) {
        console.error("[Callback] Onboarding failed:", onboardingErr)
        return NextResponse.redirect(`${origin}/login?error=onboarding_failed`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to login with an error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
