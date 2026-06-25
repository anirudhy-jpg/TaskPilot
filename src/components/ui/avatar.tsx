import React from "react"
import Image from "next/image"
import { getUserInitials, getAvatarBgColor } from "@/features/project/utils/avatar"

interface AvatarProps {
  user: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null | undefined;
  className?: string;
  size?: number;
}

export function Avatar({ user, className = "", size = 40 }: AvatarProps) {
  if (!user) {
    return (
      <div 
        className={`rounded-full shrink-0 flex items-center justify-center bg-slate-800 text-slate-400 overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-bold">?</span>
      </div>
    )
  }

  const initials = getUserInitials(user.fullName, user.email)
  const bgColor = getAvatarBgColor(user.id || user.email || "?")

  return (
    <div 
      className={`rounded-full shrink-0 flex items-center justify-center overflow-hidden ${className} ${!user.avatarUrl ? bgColor : "bg-slate-800"}`}
      style={{ width: size, height: size }}
    >
      {user.avatarUrl ? (
        <Image 
          src={user.avatarUrl} 
          alt={user.fullName || user.email || "User Avatar"} 
          width={size} 
          height={size} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <span className="font-bold text-[0.65rem] md:text-xs">
          {initials}
        </span>
      )}
    </div>
  )
}
