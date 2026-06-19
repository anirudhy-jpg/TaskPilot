import React, { Suspense } from "react"
import { AuthLayout } from "@/features/auth/components/auth-layout"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="w-full max-w-[400px] bg-white/[0.07] border border-white/10 backdrop-blur-xl rounded-[24px] p-8 shadow-2xl flex items-center justify-center min-h-[350px] z-20 text-white font-medium">
          Loading reset password form...
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  )
}
