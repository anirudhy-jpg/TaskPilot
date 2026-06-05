import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

export async function getSessionAndResponse(request: NextRequest): Promise<{
  user: User | null
  supabaseResponse: NextResponse
}> {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

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
