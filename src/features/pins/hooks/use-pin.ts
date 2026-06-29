"use client";

import { useState, useTransition } from "react";
import { togglePin as togglePinAction } from "../actions/pins.action";
import type { PinEntityType } from "../types";

const showToast = (message: string, type: "success" | "error" = "success") => {
  if (typeof document === "undefined") return;
  
  const toast = document.createElement("div");
  const borderColor = type === "success" ? "border-amber-500/30" : "border-red-500/30";
  const titleColor = type === "success" ? "text-amber-500" : "text-red-500";
  const title = type === "success" ? "Success" : "Error";
  
  toast.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900 border ${borderColor} rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 min-w-[300px] max-w-[400px] cursor-pointer hover:bg-slate-800/80 transition-colors`;
  toast.innerHTML = `
    <div class="flex-1 flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <span class="${titleColor} font-semibold text-sm">${title}</span>
      </div>
      <p class="text-sm text-slate-300 break-words">${message}</p>
    </div>
  `;
  toast.onclick = () => toast.remove();
  document.body.appendChild(toast);
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, -10px)";
      toast.style.transition = "all 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

interface UsePinOptions {
  entityType: PinEntityType;
  entityId: string;
  initialIsPinned?: boolean;
  onOptimisticUpdate?: (isPinned: boolean) => void;
}

export function usePin({
  entityType,
  entityId,
  initialIsPinned = false,
  onOptimisticUpdate,
}: UsePinOptions) {
  const [isPending, startTransition] = useTransition();
  const [isPinned, setIsPinned] = useState(initialIsPinned);

  const togglePin = async () => {
    const newIsPinned = !isPinned;
    const previousIsPinned = isPinned;

    // Optimistic UI update
    setIsPinned(newIsPinned);
    if (onOptimisticUpdate) {
      onOptimisticUpdate(newIsPinned);
    }

    startTransition(async () => {
      const result = await togglePinAction(entityType, entityId, newIsPinned);

      if (!result.success) {
        // Rollback on error
        setIsPinned(previousIsPinned);
        if (onOptimisticUpdate) {
          onOptimisticUpdate(previousIsPinned);
        }
        showToast(result.error || `Failed to ${newIsPinned ? "pin" : "unpin"} ${entityType}`, "error");
      }
    });
  };

  return {
    isPinned,
    isPending,
    togglePin,
  };
}
