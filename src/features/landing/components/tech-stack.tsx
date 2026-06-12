"use client"

import React from "react"
import { Database, Server, Palette, FileCode, CheckCircle2 } from "lucide-react"

const STACKS = [
  {
    name: "Next.js App Router",
    desc: "React framework with Server Component rendering, dynamic routing, and fast pre-fetching support.",
    icon: Server,
  },
  {
    name: "Supabase Cloud Database",
    desc: "PostgreSQL database with built-in instant session storage, Auth tokens, and real-time socket events.",
    icon: Database,
  },
  {
    name: "Tailwind CSS v4 & Shadcn",
    desc: "Engineered styling using variables, glassmorphism, responsive elements, and clean animations.",
    icon: Palette,
  },
  {
    name: "Zod Schema Validation",
    desc: "Full client and server-side data enforcement ensuring registration inputs conform to strict security.",
    icon: FileCode,
  },
]

export function TechStack() {
  return (
    <section id="stack" className="py-20 bg-[#f8fafc] border-t border-slate-200 relative">
      <div className="absolute top-0 bottom-0 left-12 w-[1px] bg-slate-200/50 pointer-events-none hidden lg:block" />
      <div className="absolute top-0 bottom-0 right-12 w-[1px] bg-slate-200/50 pointer-events-none hidden lg:block" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Foundation</h2>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Built on modern standards.
          </p>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-xl">
            TaskPilot combines stable developer-first technologies with a simple task-management workflow.
          </p>
        </div>

        {/* Tech Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STACKS.map((tech, index) => {
            const Icon = tech.icon
            return (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-lg p-6 hover:border-amber-500/40 transition-colors duration-150 shadow-sm"
              >
                <div className="w-9 h-9 rounded bg-[#f8fafc] border border-slate-200 flex items-center justify-center text-amber-600 mb-4">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-2">{tech.name}</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">{tech.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Features Checklist */}
        <div className="mt-16 pt-12 border-t border-slate-200 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600 justify-items-center">
          <div className="flex items-center gap-2.5 w-full max-w-xs">
            <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Full Social GitHub Integration</span>
          </div>
          <div className="flex items-center gap-2.5 w-full max-w-xs">
            <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Encrypted Server-Side Middleware</span>
          </div>
          <div className="flex items-center gap-2.5 w-full max-w-xs">
            <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Optimistic Client-State Updates</span>
          </div>
          <div className="flex items-center gap-2.5 w-full max-w-xs">
            <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Robust PostgreSQL Database Engine</span>
          </div>
        </div>
      </div>
    </section>
  )
}
