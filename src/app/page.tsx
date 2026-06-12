import React from "react"
import { getSession } from "@/lib/supabase/server"
import { Header } from "@/features/landing/components/header"
import { Hero } from "@/features/landing/components/hero"
import { Features } from "@/features/landing/components/features"
import { TechStack } from "@/features/landing/components/tech-stack"
import { Footer } from "@/features/landing/components/footer"

export const dynamic = "force-dynamic"

export default async function Home() {
  const { user } = await getSession()

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      <Header user={user} />
      <main className="flex-1">
        <Hero user={user} />
        <Features />
        <TechStack />
      </main>
      <Footer />
    </div>
  )
}
