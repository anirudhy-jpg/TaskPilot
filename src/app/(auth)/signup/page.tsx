import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/supabase/server"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { SignupForm } from "@/components/auth/SignupForm"

interface SignupPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams
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
