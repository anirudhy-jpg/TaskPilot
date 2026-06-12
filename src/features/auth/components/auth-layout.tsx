"use client"

import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/ui/logo"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative">
      {/* Soft layout lines */}
      <div className="absolute top-0 bottom-0 left-12 w-[1px] bg-slate-200/50 pointer-events-none hidden lg:block" />
      <div className="absolute top-0 bottom-0 right-12 w-[1px] bg-slate-200/50 pointer-events-none hidden lg:block" />

      {/* Back to Home Button */}
      <div className="absolute top-8 left-8 z-30">
        <Link 
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[400px] z-10 flex flex-col items-stretch gap-8">
        {/* Brand Sign */}
        <div className="flex justify-center select-none">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Auth form gets rendered here */}
        {children}
      </div>
    </div>
  )
}
