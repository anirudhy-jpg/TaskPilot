"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "../actions/login.action"
import { loginSchema } from "../schemas/auth.schema"

import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || searchParams.get("redirect")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})

  const handleGithubLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || "Failed to initiate GitHub login.")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors({})

    // Client-side Zod validation
    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {}
      validation.error.issues.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message
        if (err.path[0] === "password") fieldErrors.password = err.message
      })
      setValidationErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const response = await loginAction({ email, password }, next)
      if (response && !response.success) {
        const errMsg = response.error || "Failed to sign in. Please check your credentials."
        if (errMsg.toLowerCase().includes("credential") || errMsg.toLowerCase().includes("invalid")) {
          setValidationErrors({
            email: "Invalid email address or password",
            password: "Invalid email address or password",
          })
        } else {
          setError(errMsg)
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.includes("NEXT_REDIRECT")) {
        throw err
      }
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-transparent flex flex-col items-stretch">
      <div className="mb-6">
        <h2 className="text-white text-2xl font-extrabold tracking-tight">Welcome back</h2>
        <p className="text-xs text-slate-450 mt-1">Log in to your account.</p>
      </div>

      {error && (
        <div className="bg-red-950/45 border border-red-900/50 text-red-400 text-xs rounded-lg p-3 mb-5 text-center font-medium">
          {error}
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
            Work email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
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

        {/* Password */}
        <div className="flex flex-col gap-1.5 relative">
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="password" 
              className={`text-xs font-semibold transition-colors ${
                validationErrors.password ? "text-red-500" : "text-slate-300"
              }`}
            >
              Password <span className="text-red-500">*</span>
            </Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={`bg-[#111827]/60 text-white placeholder-slate-500 pr-10 rounded-lg h-10 w-full transition-all border-slate-800 ${
                validationErrors.password
                  ? "border-red-550 focus-visible:border-red-550 focus-visible:ring-red-550/20"
                  : "focus-visible:ring-amber-500/10 focus-visible:border-amber-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {validationErrors.password && (
            <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg transition-all shadow-sm active:scale-[0.98] mt-2 flex items-center justify-center gap-2 h-10 border-0 cursor-pointer text-sm font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              Verifying...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#0b0f19] px-3 text-slate-500">or</span>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleGithubLogin}
        disabled={loading}
        className="w-full bg-transparent hover:bg-slate-900 border border-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 h-10 cursor-pointer text-sm"
      >
        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
        <span>Continue with GitHub</span>
      </Button>

      {/* Footer link */}
      <div className="mt-6 text-center text-xs text-slate-400">
        Don't have an account?{" "}
        <Link href="/signup" className="text-amber-500 hover:text-amber-400 hover:underline font-semibold ml-1">
          Sign up
        </Link>
      </div>
    </div>
  )
}
