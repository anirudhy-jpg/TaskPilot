import React, { Suspense } from "react"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
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
