"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeroProps {
  user: any
}

export function Hero({ user }: HeroProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#f8fafc]">
      {/* Structural layout lines */}
      <div className="absolute top-0 bottom-0 left-12 w-[1px] bg-slate-200/65 pointer-events-none hidden lg:block" />
      <div className="absolute top-0 bottom-0 right-12 w-[1px] bg-slate-200/65 pointer-events-none hidden lg:block" />
      <div className="absolute top-[350px] left-0 right-0 h-[1px] bg-slate-200/65 pointer-events-none hidden lg:block" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto flex flex-col items-center">
          {/* Version tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 mb-6 uppercase tracking-wider shadow-sm">
            <span>Version 1.2 is live</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
            Task tracking, <br />
            <span className="text-[#2d4a3e]">built for developers.</span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-slate-600 max-w-xl mb-8 leading-relaxed">
            Manage issues, organize sprints, and collaborate with your team. A clean, keyboard-first workspace with zero configuration and instant setup.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full sm:w-auto mb-16">
            {user ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#2d4a3e] hover:bg-[#20352c] text-white font-medium px-6 py-5 rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5 border-0 h-11 cursor-pointer shadow-sm">
                  Enter Workspace
                  <ArrowRight className="w-4 h-4 text-white" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-[#2d4a3e] hover:bg-[#20352c] text-white font-medium px-6 py-5 rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5 border-0 h-11 cursor-pointer shadow-sm">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 text-white" />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-slate-200 hover:bg-slate-50 bg-white text-slate-600 hover:text-slate-900 font-semibold px-6 py-5 rounded-lg transition-colors text-sm h-11 cursor-pointer shadow-sm"
                  >
                    Login to account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Trust features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 px-6 rounded-lg border border-slate-200 bg-white w-full max-w-2xl mb-16 shadow-sm">
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <CheckCircle2 className="w-4 h-4 text-[#2d4a3e] shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900">Kanban workflow</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <Zap className="w-4 h-4 text-[#2d4a3e] shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900">GitHub integration</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <Shield className="w-4 h-4 text-[#2d4a3e] shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900">Supabase database</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Preview mockup - Crisp Light Pine Theme */}
        <div className="relative max-w-4xl mx-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-[#f8fafc] aspect-[16/9] relative">
            <div className="absolute inset-0 flex flex-col">
              {/* Shell Topbar */}
              <div className="h-10 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="text-[10px] text-slate-500 ml-4 font-mono select-none">taskpilot.app/workspace</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-4 rounded bg-slate-200" />
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-[9px] font-bold flex items-center justify-center text-slate-650">U</div>
                </div>
              </div>

              {/* Shell Workspace */}
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-40 border-r border-slate-200 bg-slate-100 p-3 hidden sm:flex flex-col gap-4 select-none">
                  <div className="space-y-1">
                    <div className="w-full h-7 rounded bg-white border border-slate-200 text-[11px] px-2 flex items-center gap-1.5 font-bold text-slate-900 shadow-sm">
                      Active Board
                    </div>
                    <div className="w-full h-7 rounded text-slate-600 text-[11px] px-2 flex items-center gap-1.5 hover:bg-white hover:text-slate-900 transition-colors">
                      Analytics
                    </div>
                    <div className="w-full h-7 rounded text-slate-600 text-[11px] px-2 flex items-center gap-1.5 hover:bg-white hover:text-slate-900 transition-colors">
                      Settings
                    </div>
                  </div>
                </div>

                {/* Dashboard Main Area */}
                <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4 bg-white">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        Sprint Board 01
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#2d4a3e]/30 text-[#2d4a3e] font-semibold bg-[#2d4a3e]/5">Active</span>
                      </h3>
                    </div>
                    <div className="w-20 h-6 rounded bg-slate-50 border border-slate-200" />
                  </div>

                  {/* Kanban Columns */}
                  <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden">
                    {/* Column 1 */}
                    <div className="bg-[#f1f5f9] border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold mb-1">
                        <span>To Do</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-250 text-[9px] text-slate-900">2</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-md space-y-1.5 shadow-sm">
                        <div className="text-[11px] font-bold text-slate-900">Integrate GitHub Login</div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>Sprint 01</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#2d4a3e]/5 text-[#2d4a3e] border border-[#2d4a3e]/10 text-[8px]">High</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="bg-[#f1f5f9] border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold mb-1">
                        <span>In Progress</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-250 text-[9px] text-slate-900">1</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-md space-y-1.5 shadow-sm">
                        <div className="text-[11px] font-bold text-slate-900">Upgrade Auth Layout & Forms</div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>Design</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#2d4a3e]/5 text-[#2d4a3e] border border-[#2d4a3e]/10 text-[8px]">High</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="bg-[#f1f5f9] border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold mb-1">
                        <span>Done</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-250 text-[9px] text-slate-900">1</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-md space-y-1.5 opacity-60 shadow-sm">
                        <div className="text-[11px] font-bold text-slate-500 line-through">Database Setup</div>
                        <div className="flex justify-between items-center text-[9px] text-slate-550">
                          <span>Database</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[8px]">Done</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
