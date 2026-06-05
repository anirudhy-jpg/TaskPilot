import React from "react"
import { User, LogOut, Mail, Calendar, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/actions/auth/auth.actions"
import type { UserProfile } from "@/types/auth.types"

interface SettingsPanelProps {
  profile: UserProfile | null
  user: {
    id: string
    email?: string
    created_at?: string
    app_metadata?: { provider?: string }
  }
}

export function SettingsPanel({ profile, user }: SettingsPanelProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your profile and account settings
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
        <div className="flex items-center gap-2 text-[#2d4a3e] mb-5">
          <User size={18} />
          <h3 className="text-sm font-bold">Profile Information</h3>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#2d4a3e]/10 flex items-center justify-center text-[#2d4a3e] text-xl font-bold uppercase">
            {profile?.fullName?.[0] ||
              profile?.email?.[0] ||
              user.email?.[0] ||
              "?"}
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              {profile?.fullName || "Unknown User"}
            </p>
            <p className="text-xs text-slate-500">{profile?.email || user.email}</p>
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-slate-100">
          <InfoRow
            icon={<Mail size={14} />}
            label="Email Address"
            value={user.email || "N/A"}
          />
          <InfoRow
            icon={<User size={14} />}
            label="Full Name"
            value={profile?.fullName || "Not set"}
          />
          <InfoRow
            icon={<Shield size={14} />}
            label="Auth Provider"
            value={user.app_metadata?.provider || "email"}
            capitalize
          />
          <InfoRow
            icon={<Calendar size={14} />}
            label="Account Created"
            value={
              user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"
            }
          />
          {profile?.updatedAt && (
            <InfoRow
              icon={<Calendar size={14} />}
              label="Profile Updated"
              value={new Date(profile.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          )}
        </div>
      </div>

      {/* Account Actions */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <LogOut size={18} />
          <h3 className="text-sm font-bold">Account Actions</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Sign out of your account. You will be redirected to the login page.
        </p>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            className="cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-component ───────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  capitalize = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span
        className={`text-xs font-semibold text-slate-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
