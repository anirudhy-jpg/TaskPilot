import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/supabase/server"
import { AuthLayout } from "@/features/auth/components/auth-layout"
import { SignupForm } from "@/features/auth/components/signup-form"

interface SignupPageProps {
  searchParams: Promise<{ next?: string; redirect?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const next = params.next || params.redirect
  const { user } = await getSession()

  if (user) {
    redirect(next || "/workspace")
  }

  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  )
}
