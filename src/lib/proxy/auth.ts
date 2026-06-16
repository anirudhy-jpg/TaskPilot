import { createProxyClient } from "@/lib/supabase/proxy"
import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

export async function getSessionAndResponse(request: NextRequest): Promise<{
  user: User | null
  supabaseResponse: NextResponse
}> {
  const { client: supabase, supabaseResponse } = createProxyClient(request)

  let user: User | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Clear Supabase auth cookies if the refresh token is invalid/not found to stop the loop
      if (error.status === 400 || error.message?.toLowerCase().includes("refresh token")) {
        const allCookies = request.cookies.getAll()
        allCookies.forEach((c) => {
          if (c.name.startsWith("sb-") || c.name.includes("-auth-token")) {
            supabaseResponse.cookies.delete(c.name)
          }
        })
      }
    } else {
      user = data.user
    }
  } catch (err) {
    // Ignore background auth verification errors
  }

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
