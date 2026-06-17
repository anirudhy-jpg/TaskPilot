"use client"

import React from "react"
import { Kanban, Users, Shield, Zap, Smartphone, Settings } from "lucide-react"

const FEATURES = [
  {
    icon: Kanban,
    title: "Kanban Boards",
    description: "Organize tasks with responsive columns. Adapt columns to your team's software release pipeline.",
  },
  {
    icon: Users,
    title: "Shared Workspaces",
    description: "Collaborate in real-time. Keep team members synchronized with clear ownership and assignments.",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    description: "Built on Supabase realtime network sockets. Actions propagate immediately without page refreshes.",
  },
  {
    icon: Shield,
    title: "Secure Authentication",
    description: "Integrated email validation and secure GitHub social login powered by Supabase Auth.",
  },
  {
    icon: Settings,
    title: "Minimalist Interface",
    description: "A soft clean theme designed to eliminate clutter and distractions. Focus purely on task execution.",
  },
  {
    icon: Smartphone,
    title: "Responsive Design",
    description: "Optimized layouts for desktop, tablet, and mobile browsers so you can manage sprints on the go.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 bg-[#0b0f19] relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Capabilities</h2>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered for speed and clarity.
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-xl">
            Features tailored for developer workflows, keeping you focused on writing code and shipping features.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, index) => {
            const Icon = feat.icon
            return (
              <div
                key={index}
                className="group relative rounded-lg border border-slate-800 bg-[#111827]/40 p-6 hover:border-amber-500/40 hover:bg-[#111827]/60 transition-all duration-150 shadow-sm"
              >
                {/* Feature Icon */}
                <div className="w-9 h-9 rounded bg-[#0b0f19] border border-slate-800 text-amber-500 flex items-center justify-center mb-5 group-hover:text-amber-400 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <h3 className="text-sm font-bold text-white mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
