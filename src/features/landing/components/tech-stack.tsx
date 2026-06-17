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
    <section id="stack" className="py-20 bg-[#0b0f19] relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Foundation</h2>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Built on modern standards.
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-xl">
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
                className="bg-[#111827]/40 border border-slate-800 rounded-lg p-6 hover:border-amber-500/40 hover:bg-[#111827]/60 transition-colors duration-150 shadow-sm"
              >
                <div className="w-9 h-9 rounded bg-[#0b0f19] border border-slate-800 flex items-center justify-center text-amber-500 mb-4">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white mb-2">{tech.name}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{tech.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Features Checklist */}
        <div className="mt-16 pt-12 border-t border-slate-800 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-400 justify-items-center">
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
