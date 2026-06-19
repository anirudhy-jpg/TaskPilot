"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPasswordSchema } from "../schemas/auth.schema"
import { createClient } from "@/lib/supabase/client"

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [validatingSession, setValidatingSession] = useState(true)
  const [validationErrors, setValidationErrors] = useState<{ password?: string; confirmPassword?: string }>({})

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        setError("Invalid or expired password reset link. Please request a new one.")
      }
      setValidatingSession(false)
    }
    
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors({})

    // Client-side Zod validation
    const validation = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!validation.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {}
      validation.error.issues.forEach((err) => {
        if (err.path[0] === "password") fieldErrors.password = err.message
        if (err.path[0] === "confirmPassword") fieldErrors.confirmPassword = err.message
      })
      setValidationErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message || "Failed to update password. Please try again.")
      } else {
        setSuccess("Password updated successfully. Redirecting...")
        
        // Ensure supabase cleans up the session after a reset
        await supabase.auth.signOut()
        
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      }
    } catch (err: unknown) {
      console.error(err)
      setError("An unexpected error occurred. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  if (validatingSession) {
    return (
      <div className="w-full bg-transparent flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
        <p className="text-sm text-slate-300">Validating session...</p>
      </div>
    )
  }

  if (error && error.includes("Invalid or expired")) {
    return (
      <div className="w-full bg-transparent flex flex-col items-center justify-center text-center">
        <div className="bg-red-950/45 border border-red-900/50 text-red-400 text-sm rounded-lg p-4 mb-6 w-full font-medium">
          {error}
        </div>
        <Button
          onClick={() => router.push("/forgot-password")}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg transition-all shadow-sm active:scale-[0.98] h-10 border-0 cursor-pointer text-sm font-bold"
        >
          Request New Link
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full bg-transparent flex flex-col items-stretch">
      <div className="mb-6">
        <h2 className="text-white text-2xl font-extrabold tracking-tight">Reset Password</h2>
        <p className="text-xs text-slate-450 mt-1">Enter your new password below.</p>
      </div>

      {success && (
        <div className="bg-emerald-950/45 border border-emerald-900/50 text-emerald-400 text-xs rounded-lg p-3 mb-5 text-center font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-950/45 border border-red-900/50 text-red-400 text-xs rounded-lg p-3 mb-5 text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* New Password */}
        <div className="flex flex-col gap-1.5 relative">
          <Label 
            htmlFor="password" 
            className={`text-xs font-semibold transition-colors ${
              validationErrors.password ? "text-red-500" : "text-slate-300"
            }`}
          >
            New Password <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="Enter new password"
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

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5 relative">
          <Label 
            htmlFor="confirmPassword" 
            className={`text-xs font-semibold transition-colors ${
              validationErrors.confirmPassword ? "text-red-500" : "text-slate-300"
            }`}
          >
            Confirm Password <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              placeholder="Confirm new password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className={`bg-[#111827]/60 text-white placeholder-slate-500 pr-10 rounded-lg h-10 w-full transition-all border-slate-800 ${
                validationErrors.confirmPassword
                  ? "border-red-550 focus-visible:border-red-550 focus-visible:ring-red-550/20"
                  : "focus-visible:ring-amber-500/10 focus-visible:border-amber-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {validationErrors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.confirmPassword}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg transition-all shadow-sm active:scale-[0.98] h-10 border-0 cursor-pointer text-sm font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                Updating...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0b0f19] px-3 text-slate-500">or</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => router.push("/workspace")}
            disabled={loading}
            className="w-full bg-transparent hover:bg-slate-900 border border-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm active:scale-[0.98] flex items-center justify-center h-10 cursor-pointer text-sm"
          >
            Continue to Workspace
          </Button>
        </div>
      </form>
    </div>
  )
}
