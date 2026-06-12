import { createProxyClient } from "@/lib/supabase/proxy"
import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

export async function getSessionAndResponse(request: NextRequest): Promise<{
  user: User | null
  supabaseResponse: NextResponse
}> {
  const { client: supabase, supabaseResponse } = createProxyClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { user, supabaseResponse }
}

export function handleAuthRoutes(request: NextRequest, user: User | null): NextResponse | null {
  const path = request.nextUrl.pathname

  // Protected route checking — redirect unauthenticated users to login
  const protectedRoutes = ["/workspace", "/projects", "/teams", "/members", "/settings"]
  if (protectedRoutes.some((route) => path.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  }

  // Auth pages — redirect authenticated users to workspace
  if (path === "/login" || path === "/signup") {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = "/workspace"
      return NextResponse.redirect(url)
    }
  }

  return null
}
