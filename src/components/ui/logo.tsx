import React from "react"

interface LogoProps {
  className?: string
  iconOnly?: boolean
  size?: "sm" | "md" | "lg"
}

export function Logo({ className = "", iconOnly = false, size = "md" }: LogoProps) {
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
  }

  return (
    <div className={`flex items-center gap-2 group select-none ${className}`}>
      {/* Sleek Navigation Arrow Logo Mark */}
      <div className={`flex items-center justify-center rounded-lg bg-[#2d4a3e] text-white shadow-sm p-1 ${size === "sm" ? "p-0.5" : ""}`}>
        <svg
          className={`${iconSizes[size]} text-white`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2L11 13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>
      {!iconOnly && (
        <span className={`font-bold text-slate-900 tracking-tight ${textSizes[size]}`}>
          TaskPilot<span className="text-[#2d4a3e]">.</span>
        </span>
      )}
    </div>
  )
}
