import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  // SSE has been fully deprecated and replaced by Supabase Realtime client subscriptions.
  return new NextResponse("SSE Deprecated", { status: 410 })
}
