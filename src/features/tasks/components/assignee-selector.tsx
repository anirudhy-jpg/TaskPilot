"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { User } from "lucide-react";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { getUserInitials, getAvatarBgColor } from "@/features/project/utils/avatar";

interface AssigneeTaskProps {
  id: string;
  assigneeId?: string | null;
  assignee?: {
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface AssigneeSelectorProps {
  task: AssigneeTaskProps;
  members: WorkspaceMember[];
  currentUserId?: string;
  onChange: (taskId: string, assigneeId: string | null) => void;
  size?: "small" | "large";
}

export function AssigneeSelector({
  task,
  members,
  currentUserId,
  onChange,
  size = "small",
}: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Calculate coordinates helper
  const calculateCoords = (buttonEl: HTMLButtonElement) => {
    const rect = buttonEl.getBoundingClientRect();
    const leftPos = Math.max(16, rect.right - 256);
    const openUp = rect.bottom + 270 > window.innerHeight;
    
    if (openUp) {
      return { bottom: window.innerHeight - rect.top + 8, left: leftPos };
    }
    return { top: rect.bottom + 8, left: leftPos };
  };

  // Toggle dropdown with pre-calculated coordinates to prevent flicker
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const newCoords = calculateCoords(buttonRef.current);
      setCoords(newCoords);
    }
    setIsOpen(!isOpen);
  };

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".assignee-dropdown-portal")
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Recalculate coordinates on scroll/resize while open
  useEffect(() => {
    function updateCoords() {
      if (buttonRef.current) {
        const newCoords = calculateCoords(buttonRef.current);
        setCoords(newCoords);
      }
    }

    if (isOpen) {
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  const isLarge = size === "large";
  const sizeClasses = isLarge ? "w-8 h-8" : "w-5 h-5";
  const textClasses = isLarge ? "text-xs" : "text-[9px]";
  const iconSize = isLarge ? 14 : 10;

  return (
    <div className={`shrink-0 relative ${sizeClasses}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`focus:outline-none cursor-pointer ${sizeClasses} rounded-full flex items-center justify-center`}
        title="Assign member"
      >
        {task.assignee ? (
          task.assignee.avatarUrl ? (
            <Image
              src={task.assignee.avatarUrl}
              alt={task.assignee.fullName || task.assignee.email || "Assignee"}
              width={isLarge ? 32 : 20}
              height={isLarge ? 32 : 20}
              className={`${sizeClasses} rounded-full object-cover border border-slate-800 shadow-sm hover:border-amber-500 transition-colors`}
            />
          ) : (
            <div
              className={`${sizeClasses} rounded-full flex items-center justify-center ${textClasses} font-bold border border-slate-900 shadow-sm uppercase hover:scale-105 transition-all ${getAvatarBgColor(
                task.assignee.fullName || task.assignee.email || ""
              )}`}
              title={task.assignee.fullName || task.assignee.email || "Assignee"}
            >
              {getUserInitials(task.assignee.fullName || "", task.assignee.email || "")}
            </div>
          )
        ) : (
          <div
            className={`${sizeClasses} rounded-full bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors`}
            title="Unassigned"
          >
            <User size={iconSize} />
          </div>
        )}
      </button>

      {isOpen && mounted && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
            ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
            left: `${coords.left}px`,
          }}
          className="assignee-dropdown-portal z-50 w-64 bg-slate-900/95 backdrop-blur-md text-slate-200 rounded-xl border border-amber-500/20 shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Unassigned */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(task.id, null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-lg text-xs font-semibold hover:bg-slate-800/80 transition-colors cursor-pointer ${
              !task.assigneeId ? "bg-amber-500/10 border border-amber-500/25 text-amber-300" : ""
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-slate-950 flex items-center justify-center text-slate-500">
              <User size={12} />
            </div>
            <span className="text-slate-350 font-bold">Unassigned</span>
          </button>


          <div className="h-[1px] bg-slate-800 my-1" />

          {/* Members */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const displayName = member.profile?.fullName || member.profile?.email || member.userId;
              const isSelected = task.assigneeId === member.userId;

              return (
                <button
                   key={member.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(task.id, member.userId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer ${
                    isSelected ? "bg-amber-500/10 border border-amber-500/25 text-amber-300" : ""
                  }`}
                >
                  {member.profile?.avatarUrl ? (
                    <Image
                      src={member.profile.avatarUrl}
                      alt={displayName}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover border border-slate-800 shadow-sm"
                    />
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase border border-slate-800 shadow-sm ${getAvatarBgColor(
                        displayName
                      )}`}
                    >
                      {getUserInitials(member.profile?.fullName, member.profile?.email || member.userId)}
                    </div>
                  )}

                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-200 truncate">
                      {displayName} {isCurrentUser && <span className="text-[10px] text-slate-500 font-semibold ml-0.5">(Assign to me)</span>}
                    </span>
                    {member.profile?.email && (
                      <span className="text-[9px] text-slate-500 truncate mt-0.5">
                        {member.profile.email}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
