"use client";

import React, { useState, useEffect, useRef } from "react";
import { Square } from "lucide-react";
import { useActiveTimer, useStopTimer } from "../hooks/use-time-tracking";
import { formatSecondsToTimer } from "../utils/time-format";
import { usePathname } from "next/navigation";

export function GlobalTimerWidget() {
  const { data: activeTimer, isLoading } = useActiveTimer();
  const { mutate: stopTimer, isPending: isStopping } = useStopTimer();
  const pathname = usePathname();

  const [now, setNow] = useState(() => Date.now());
  const prevWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeTimer?.start_time) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [activeTimer?.start_time]);

  // Detect workspace switch and show toast
  useEffect(() => {
    if (!activeTimer?.task?.title) return;
    
    // Extract workspace ID from pathname (e.g. /workspace/123-abc/...)
    const match = pathname.match(/^\/workspace\/([^\/]+)/);
    const currentWorkspaceId = match ? match[1] : null;

    if (currentWorkspaceId && prevWorkspaceIdRef.current && currentWorkspaceId !== prevWorkspaceIdRef.current) {
      // Create a temporary toast element
      const toast = document.createElement("div");
      toast.className = "fixed bottom-6 right-6 z-[100] bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-2xl flex flex-col gap-1 animate-in slide-in-from-bottom-5 fade-in duration-300";
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span class="text-[12px] font-black text-slate-200 tracking-wide">Active timer continues running</span>
        </div>
        <span class="text-[11px] font-medium text-slate-400 pl-4">${activeTimer.task.title}</span>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        toast.style.transition = "all 0.3s ease-out";
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    if (currentWorkspaceId !== prevWorkspaceIdRef.current) {
      prevWorkspaceIdRef.current = currentWorkspaceId;
    }
  }, [pathname, activeTimer]);

  const currentDurationRaw = activeTimer?.start_time
    ? Math.floor((now - new Date(activeTimer.start_time).getTime()) / 1000)
    : 0;

  const currentDuration = currentDurationRaw > 86400 ? 86400 : currentDurationRaw;

  useEffect(() => {
    if (currentDurationRaw >= 86400 && !isStopping) {
      stopTimer();
    }
  }, [currentDurationRaw, isStopping, stopTimer]);

  if (isLoading || !activeTimer) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider leading-none flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Tracking Time
        </span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-[13px] font-bold text-slate-200 leading-none truncate max-w-[120px]" title={activeTimer.task?.title || "Unknown Task"}>
            {activeTimer.task?.title || "Unknown Task"}
          </span>
          <span className="text-sm font-black text-amber-400 tabular-nums leading-none">
            {formatSecondsToTimer(currentDuration)}
          </span>
        </div>
      </div>
      <div className="h-6 w-px bg-amber-500/20 mx-1"></div>
      <button
        onClick={() => stopTimer()}
        disabled={isStopping}
        className="p-1.5 rounded-md hover:bg-amber-500/20 text-amber-500 transition-colors cursor-pointer disabled:opacity-50"
        title="Stop Timer"
      >
        <Square size={16} className="fill-current" />
      </button>
    </div>
  );
}
