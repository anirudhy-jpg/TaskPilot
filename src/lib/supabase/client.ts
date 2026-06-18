import { createBrowserClient } from "@supabase/ssr"
import { ENV } from "../constants/env"

export function createClient() {
  return createBrowserClient(
    ENV.NEXT_PUBLIC_SUPABASE_URL,
    ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

