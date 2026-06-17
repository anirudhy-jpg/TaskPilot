"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0b0f19] text-slate-200 p-6 overflow-hidden select-none">
      {/* Premium background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-15 pointer-events-none" />

      {/* Background ambient glows */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none animate-pulse" 
        style={{ animationDuration: '8s' }}
      />
      <div 
        className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-slate-800/10 blur-[100px] pointer-events-none animate-float" 
      />

      {/* Custom obsidian glass card */}
      <div className="relative z-10 bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 sm:p-12 max-w-md w-full text-center border border-slate-800/60 shadow-2xl flex flex-col items-center gap-6">
        
        {/* Graphic illustration */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-950/80 border border-slate-850 shadow-inner">
          <Compass className="w-10 h-10 text-amber-500 animate-spin-slow" />
          <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-8xl font-black tracking-tighter text-white select-none">
            4<span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-400 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">0</span>4
          </h1>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Lost in Space
          </h2>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            The page you are looking for doesn't exist, has been moved, or is temporarily unavailable.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-center mt-2 w-full">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-6 h-11 gap-2 border-slate-800 hover:bg-slate-900 bg-transparent text-slate-350 hover:text-white transition-all cursor-pointer font-semibold rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>

      {/* Subtle footer credit/tag */}
      <span className="absolute bottom-6 text-[10px] font-mono text-slate-600 select-none tracking-widest uppercase">
        TaskPilot Navigation System
      </span>
    </div>
  )
}
