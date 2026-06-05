import React from "react"
import { getSession } from "@/lib/supabase/server"
import { Header } from "@/components/landing/Header"
import { Hero } from "@/components/landing/Hero"
import { Features } from "@/components/landing/Features"
import { TechStack } from "@/components/landing/TechStack"
import { Footer } from "@/components/landing/Footer"

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
