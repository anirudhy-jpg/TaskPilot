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
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#0b0f19]">
      {/* Ambient glow behind mockup */}
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[70%] h-[60%] rounded-full bg-amber-500/8 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto flex flex-col items-center">
          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
            Plan. Manage. Track.<br />
            <span className="text-amber-500">All in One Place.</span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-slate-400 max-w-xl mb-8 leading-relaxed">
            TaskPilot helps teams organize work, track progress, and deliver projects successfully. Simple, powerful, and beautiful.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full sm:w-auto mb-16">
            {user ? (
              <Link href="/workspace" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-5 rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5 border-0 h-11 cursor-pointer shadow-sm shadow-amber-500/10">
                  Enter Workspace
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-5 rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5 border-0 h-11 cursor-pointer shadow-sm shadow-amber-500/10">
                    Get Started for Free
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-slate-800 hover:bg-slate-900/50 bg-transparent text-slate-300 hover:text-white font-semibold px-6 py-5 rounded-lg transition-colors text-sm h-11 cursor-pointer"
                  >
                    Login to account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Trust features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 px-6 rounded-lg border border-slate-850 bg-slate-900/40 backdrop-blur-md w-full max-w-2xl mb-16 shadow-sm">
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-200">Kanban workflow</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-200">GitHub integration</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <Shield className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-200">Supabase database</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Preview mockup - Premium Slate Theme */}
        <div className="relative max-w-4xl mx-auto rounded-xl border border-slate-800 bg-[#090d16] p-2 shadow-2xl shadow-amber-500/5">
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b0f19] aspect-[16/9] relative">
            <div className="absolute inset-0 flex flex-col">
              {/* Shell Topbar */}
              <div className="h-10 border-b border-slate-850 px-4 flex items-center justify-between bg-[#090d16]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  </div>
                  <span className="text-[10px] text-slate-400 ml-4 font-mono select-none">taskpilot.app/workspace</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-4 rounded bg-slate-900 border border-slate-800" />
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-[9px] font-bold flex items-center justify-center text-slate-950 select-none">U</div>
                </div>
              </div>

              {/* Shell Workspace */}
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-40 border-r border-slate-850 bg-[#090d16] p-3 hidden sm:flex flex-col gap-4 select-none">
                  <div className="space-y-1">
                    <div className="w-full h-7 rounded bg-slate-900 border border-slate-800 text-[11px] px-2 flex items-center gap-1.5 font-bold text-white shadow-sm">
                      Active Board
                    </div>
                    <div className="w-full h-7 rounded text-slate-400 text-[11px] px-2 flex items-center gap-1.5 hover:bg-slate-900 hover:text-white transition-colors">
                      Analytics
                    </div>
                    <div className="w-full h-7 rounded text-slate-400 text-[11px] px-2 flex items-center gap-1.5 hover:bg-slate-900 hover:text-white transition-colors">
                      Settings
                    </div>
                  </div>
                </div>

                {/* Dashboard Main Area */}
                <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4 bg-[#0b0f19]">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Sprint Board 01
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/35 text-amber-500 font-semibold bg-amber-500/5">Active</span>
                      </h3>
                    </div>
                    <div className="w-20 h-6 rounded bg-slate-900 border border-slate-800" />
                  </div>

                  {/* Kanban Columns */}
                  <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden">
                    {/* Column 1 */}
                    <div className="bg-slate-900/40 border border-slate-850 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                        <span>To Do</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-200">2</span>
                      </div>
                      <div className="p-2.5 bg-[#111827] border border-slate-800 rounded-md space-y-1.5 shadow-sm">
                        <div className="text-[11px] font-bold text-white">Integrate GitHub Login</div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400">
                          <span>Sprint 01</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/5 text-rose-450 border border-rose-500/10 text-[8px]">High</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="bg-slate-900/40 border border-slate-850 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                        <span>In Progress</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-200">1</span>
                      </div>
                      <div className="p-2.5 bg-[#111827] border border-slate-800 rounded-md space-y-1.5 shadow-sm">
                        <div className="text-[11px] font-bold text-white">Upgrade Auth Layout & Forms</div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400">
                          <span>Design</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/5 text-amber-550 border border-amber-500/10 text-[8px]">Medium</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="bg-slate-900/40 border border-slate-850 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                        <span>Done</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-200">1</span>
                      </div>
                      <div className="p-2.5 bg-[#111827] border border-slate-800 rounded-md space-y-1.5 opacity-60 shadow-sm">
                        <div className="text-[11px] font-bold text-slate-400 line-through">Database Setup</div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>Database</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 text-[8px]">Done</span>
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
