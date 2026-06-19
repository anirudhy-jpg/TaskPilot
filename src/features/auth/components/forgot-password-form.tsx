"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPasswordSchema } from "../schemas/auth.schema"
import { createClient } from "@/lib/supabase/client"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ email?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})
    setSuccess(false)
    setError(null)

    // Client-side Zod validation
    const validation = forgotPasswordSchema.safeParse({ email })
    if (!validation.success) {
      const fieldErrors: { email?: string } = {}
      validation.error.issues.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message
      })
      setValidationErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/callback?next=/reset-password`,
      })

      if (error) {
        setError("Failed to send reset link. Please try again.")
      } else {
        setSuccess(true)
      }
    } catch (err: unknown) {
      console.error(err)
      setError("An unexpected error occurred. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-transparent flex flex-col items-stretch">
      <div className="mb-6">
        <h2 className="text-white text-2xl font-extrabold tracking-tight">Forgot Password</h2>
        <p className="text-xs text-slate-450 mt-1">Enter your email to receive a password reset link.</p>
      </div>

      {error && (
        <div className="bg-red-950/45 border border-red-900/50 text-red-400 text-xs rounded-lg p-3 mb-5 text-center font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/45 border border-emerald-900/50 text-emerald-400 text-xs rounded-lg p-3 mb-5 text-center font-medium">
          If an account exists with this email, you will receive a reset link shortly.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label 
            htmlFor="email" 
            className={`text-xs font-semibold transition-colors ${
              validationErrors.email ? "text-red-500" : "text-slate-300"
            }`}
          >
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || success}
            className={`bg-[#111827]/60 text-white placeholder-slate-500 rounded-lg h-10 w-full transition-all border-slate-800 ${
              validationErrors.email
                ? "border-red-550 focus-visible:border-red-550 focus-visible:ring-red-550/20"
                : "focus-visible:ring-amber-500/10 focus-visible:border-amber-500"
            }`}
          />
          {validationErrors.email && (
            <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.email}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading || success}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg transition-all shadow-sm active:scale-[0.98] mt-2 flex items-center justify-center gap-2 h-10 border-0 cursor-pointer text-sm font-bold disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        <Link href="/login" className="text-amber-500 hover:text-amber-400 hover:underline font-semibold flex items-center justify-center gap-1">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </div>
    </div>
  )
}
