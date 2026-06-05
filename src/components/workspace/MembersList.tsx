import React from "react"
import { Shield, Crown, User } from "lucide-react"
import type { WorkspaceMember, MemberRole } from "@/types/workspace.types"

interface MembersListProps {
  members: WorkspaceMember[]
}

const roleConfig: Record<
  MemberRole,
  { label: string; color: string; bgColor: string; icon: typeof Shield }
> = {
  owner: {
    label: "Owner",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: Crown,
  },
  admin: {
    label: "Admin",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: Shield,
  },
  member: {
    label: "Member",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200",
    icon: User,
  },
}

export function MembersList({ members }: MembersListProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Members</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {members.length} member{members.length !== 1 ? "s" : ""} in this
          workspace
        </p>
      </div>

      {members.length === 0 ? (
        <div className="p-12 rounded-xl bg-white border border-slate-200 text-center">
          <div className="text-3xl mb-3">👤</div>
          <p className="text-sm text-slate-500">No members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const cfg = roleConfig[member.role] || roleConfig.member
            const RoleIcon = cfg.icon
            return (
              <div
                key={member.id}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#2d4a3e]/10 flex items-center justify-center text-[#2d4a3e] text-sm font-bold uppercase shrink-0">
                    {member.profile?.fullName?.[0] ||
                      member.profile?.email?.[0] ||
                      "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {member.profile?.fullName || "Unknown User"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {member.profile?.email || member.userId}
                    </p>
                  </div>
                </div>

                {/* Role badge + join date */}
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${cfg.bgColor} ${cfg.color}`}
                  >
                    <RoleIcon size={10} />
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Joined{" "}
                    {member.joinedAt
                      ? new Date(member.joinedAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
