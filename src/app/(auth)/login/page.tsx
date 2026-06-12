import React, { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/supabase/server"
import { AuthLayout } from "@/features/auth/components/auth-layout"
import { LoginForm } from "@/features/auth/components/login-form"

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams
  const { user } = await getSession()

  if (user) {
    redirect(next || "/workspace")
  }

  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="w-full max-w-[400px] bg-white/[0.07] border border-white/10 backdrop-blur-xl rounded-[24px] p-8 shadow-2xl flex items-center justify-center min-h-[350px] z-20 text-white font-medium">
          Loading login form...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
