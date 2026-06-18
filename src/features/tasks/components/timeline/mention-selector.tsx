/* eslint-disable @next/next/no-img-element */
import React from "react";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";

interface MentionSelectorProps {
  members: WorkspaceMember[];
  onSelect: (member: WorkspaceMember) => void;
  selectedIndex: number;
}

export function MentionSelector({ members, onSelect, selectedIndex }: MentionSelectorProps) {
  if (members.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-[200px] max-h-[200px] overflow-y-auto">
      {members.map((member, index) => (
        <button
          key={member.id}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(member);
          }}
          className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
            index === selectedIndex ? "bg-slate-800" : "hover:bg-slate-800/50"
          }`}
        >
          {member.profile?.avatarUrl ? (
            <img src={member.profile.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-slate-800" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase border border-slate-700">
              {member.profile?.email.charAt(0)}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-200 truncate">
              {member.profile?.fullName || member.profile?.email.split('@')[0]}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
