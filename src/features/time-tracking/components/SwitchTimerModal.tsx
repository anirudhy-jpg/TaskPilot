"use client";

import React, { useEffect, useState } from "react";
import { X, Play, AlertCircle } from "lucide-react";
import { formatSecondsToTimer } from "../utils/time-format";
import type { TimeEntry } from "../types";

interface SwitchTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activeTimer: TimeEntry;
  newTaskTitle: string;
  newWorkspaceName?: string;
  isPending: boolean;
}

export function SwitchTimerModal({
  isOpen,
  onClose,
  onConfirm,
  activeTimer,
  newTaskTitle,
  newWorkspaceName,
  isPending,
}: SwitchTimerModalProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (isOpen && activeTimer?.start_time) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      
      // Update immediately but outside of synchronous effect execution
      const timeout = setTimeout(() => setNow(Date.now()), 0);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, activeTimer?.start_time]);

  if (!isOpen) return null;

  const currentDuration = activeTimer?.start_time
    ? Math.floor((now - new Date(activeTimer.start_time).getTime()) / 1000)
    : 0;

  const currentTaskTitle = activeTimer.task?.title || "Unknown Task";
  const currentWorkspaceName = activeTimer.task?.project?.workspace?.name || "Unknown Workspace";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-955/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => !isPending && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle size={18} className="text-amber-500" />
            </div>
            <h2 className="text-[15px] font-black text-slate-200 tracking-wide">
              Active Timer Running
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          <p className="text-[13px] text-slate-300">
            You already have an active timer running. Do you want to stop it and start tracking time for this task instead?
          </p>

          <div className="flex flex-col gap-4">
            {/* Current Task */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-800/40 border border-amber-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Current Running Task</span>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-200 leading-snug">{currentTaskTitle}</span>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5">{currentWorkspaceName}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-[13px] font-black text-slate-200 tabular-nums">{formatSecondsToTimer(currentDuration)}</span>
              </div>
            </div>

            {/* New Task */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider">New Task to Start</span>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-200 leading-snug">{newTaskTitle}</span>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5">{newWorkspaceName || "Current Workspace"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-[12px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2 text-[12px] font-black text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Play size={14} className="fill-current" />
            {isPending ? "Switching..." : "Switch Timer"}
          </button>
        </div>
      </div>
    </div>
  );
}
