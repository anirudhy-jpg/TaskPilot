"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Logo } from "@/components/ui/logo"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  const isSignUp = pathname?.includes("signup")

  return (
    <div className="min-h-screen w-full bg-[#0b0f19] flex items-center justify-center p-6 relative overflow-hidden text-white">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/3 blur-[120px] pointer-events-none" />

      {/* Back to Home Button */}
      <div className="absolute top-8 left-8 z-30">
        <Link 
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>

      {/* FLOATING BACKGROUND GRAPHICS */}
      {isSignUp ? (
        // Signup Background Elements
        <>
          {/* Faint Mockup on the Left */}
          <div className="absolute left-[8%] top-1/2 -translate-y-1/2 w-[340px] aspect-[4/3] rounded-xl bg-[#0b0f19]/40 border border-slate-800/40 p-4 shadow-2xl flex flex-col gap-3 pointer-events-none select-none opacity-20 hidden lg:flex rotate-[-3deg] scale-95 transition-all duration-300">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-850" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-855" />
                </div>
                <span className="text-[8px] text-slate-500 font-mono">Workspace Overview</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="bg-slate-900/30 border border-slate-850 rounded-lg p-2.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="w-6 h-2 rounded bg-amber-500/10 border border-amber-500/20" />
                  <div className="text-[9px] font-bold text-slate-200">Sprint Planning</div>
                </div>
                <div className="w-10 h-1.5 rounded bg-slate-800" />
              </div>
              <div className="bg-slate-900/30 border border-slate-850 rounded-lg p-2.5 flex flex-col gap-2">
                <div className="w-10 h-2 bg-slate-850 rounded" />
                <svg className="w-full h-8 text-amber-500/60" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M0 35 Q 25 15, 50 25 T 100 5" fill="none" />
                </svg>
              </div>
            </div>
          </div>

          {/* Faint Checklist on the Right */}
          <div className="absolute right-[8%] top-1/2 -translate-y-1/2 space-y-4 max-w-[240px] pointer-events-none select-none opacity-30 hidden lg:block rotate-[3deg] scale-95 transition-all duration-300">
            <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Unlimited projects & tasks</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Real-time collaboration</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Advanced reporting</span>
            </div>
          </div>
        </>
      ) : (
        // Login Background Elements
        <>
          {/* Faint Plane on the Right */}
          <div className="absolute right-[10%] top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-amber-500/3 blur-[40px] absolute pointer-events-none select-none hidden lg:block" />
          <div className="absolute right-[12%] top-1/2 -translate-y-1/2 p-6 rounded-2xl bg-[#0b0f19]/30 border border-slate-800/40 shadow-2xl flex items-center justify-center animate-float pointer-events-none select-none opacity-20 hidden lg:flex rotate-[6deg] scale-95">
            <svg
              className="w-16 h-16 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2 15 22 11 13 2 9 22 2z" />
              <path d="M22 2 11 13" />
            </svg>
          </div>

          {/* Faint Welcome graphic/text on the Left */}
          <div className="absolute left-[12%] top-1/2 -translate-y-1/2 max-w-[200px] pointer-events-none select-none opacity-20 hidden lg:block rotate-[-6deg] scale-95">
            <h3 className="text-lg font-black text-white mb-2">Welcome back!</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">Glad to see you again. Pick up where you left off.</p>
          </div>
        </>
      )}

      {/* Main Centered Container */}
      <div className="w-full max-w-[440px] bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl z-20 flex flex-col items-stretch gap-6 relative">
        {/* Brand Logo */}
        <div className="flex justify-center select-none mb-1">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Form gets rendered here */}
        {children}
      </div>
    </div>
  )
}
