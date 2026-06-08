import React from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/actions/auth/auth.actions"
import { LogOut } from "lucide-react"
import type { UserProfile } from "@/types/auth.types"

interface HeaderProps {
  profile: UserProfile | null
  user: {
    email?: string
    user_metadata?: {
      full_name?: string
      name?: string
    }
  }
}

export function Header({ profile, user }: HeaderProps) {
  return (
    <header className="border-b border-amber-900/10 bg-white/50 backdrop-blur-xl sticky top-0 z-50 w-full select-none">
      <div className="w-full px-6 h-14 flex items-center justify-between">
        <Link href="/" className="cursor-pointer">
          <Logo size="md" />
        </Link>

        <div className="flex items-center gap-3">
          {/* User chip */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50/60 to-yellow-50/60 hover:from-amber-100/60 hover:to-yellow-100/60 px-3.5 py-1.5 rounded-full border border-amber-900/10 shadow-3xs transition-all duration-300">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              {profile?.fullName?.[0] ||
                profile?.email?.[0] ||
                user.email?.[0] ||
                "?"}
            </div>
            <span className="text-[11px] font-bold text-slate-700 hidden sm:inline-block truncate max-w-[150px]">
              {profile?.fullName || profile?.email || user.email}
            </span>
          </div>

          {/* Logout */}
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="text-slate-550 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-full transition-colors w-8 h-8"
            >
              <LogOut size={15} className="stroke-[2.5]" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
