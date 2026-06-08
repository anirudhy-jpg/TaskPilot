import { NextResponse, type NextRequest } from "next/server"

export function handleLegacyRedirects(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname

  // Redirect old /dashboard routes to new direct routes
  if (path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone()
    const suffix = path.substring("/dashboard".length)
    if (suffix === "/projects" && request.nextUrl.searchParams.has("projectId")) {
      const projectId = request.nextUrl.searchParams.get("projectId")
      url.pathname = `/projects/${projectId}`
      url.searchParams.delete("projectId")
      return NextResponse.redirect(url)
    }
    url.pathname = suffix === "" || suffix === "/" || suffix === "/overview" ? "/workspace" : suffix
    return NextResponse.redirect(url)
  }

  // Redirect nested /workspace/subroute routes to direct routes (except for /workspace itself)
  if (path.startsWith("/workspace/")) {
    const url = request.nextUrl.clone()
    const suffix = path.substring("/workspace".length)
    if (suffix === "/projects" && request.nextUrl.searchParams.has("projectId")) {
      const projectId = request.nextUrl.searchParams.get("projectId")
      url.pathname = `/projects/${projectId}`
      url.searchParams.delete("projectId")
      return NextResponse.redirect(url)
    }
    url.pathname = suffix
    return NextResponse.redirect(url)
  }

  // Redirect /overview to /workspace
  if (path === "/overview") {
    const url = request.nextUrl.clone()
    url.pathname = "/workspace"
    return NextResponse.redirect(url)
  }

  // Redirect /projects?projectId=xxx to /projects/xxx
  if (path === "/projects" && request.nextUrl.searchParams.has("projectId")) {
    const url = request.nextUrl.clone()
    const projectId = request.nextUrl.searchParams.get("projectId")
    url.pathname = `/projects/${projectId}`
    url.searchParams.delete("projectId")
    return NextResponse.redirect(url)
  }

  return null
}
