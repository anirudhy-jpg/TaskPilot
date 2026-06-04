"use client"

import React from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export function Footer() {
  return (
    <footer className="bg-[#f8fafc] border-t border-slate-200 py-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Name */}
          <Logo size="sm" />

          {/* Quick Navigation links */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            <a href="#features" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors duration-150">
              Features
            </a>
            <a href="#stack" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors duration-150">
              Tech Stack
            </a>
            <Link href="/login" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors duration-150">
              Login
            </Link>
            <Link href="/signup" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors duration-150">
              Register
            </Link>
          </div>

          {/* Attribution & Copyright */}
          <div className="text-center md:text-right">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} TaskPilot. All rights reserved.
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Next.js // Supabase // Tailwind
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
