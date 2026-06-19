import { type NextRequest } from "next/server"
import { handleLegacyRedirects } from "@/lib/proxy/redirects"
import { getSessionAndResponse, handleAuthRoutes } from "@/lib/proxy/auth"

export async function proxy(request: NextRequest) {
  // 1. Run legacy redirects logic first
  const redirectResponse = handleLegacyRedirects(request)
  if (redirectResponse) {
    return redirectResponse
  }

  // 2. Retrieve session and prepare response with updated cookies
  const { user, supabaseResponse } = await getSessionAndResponse(request)

  // 3. Handle route authorization based on authentication status
  const authResponse = handleAuthRoutes(request, user)
  if (authResponse) {
    return authResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any file with an extension (e.g. svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
