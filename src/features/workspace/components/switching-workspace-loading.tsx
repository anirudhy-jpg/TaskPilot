import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

export function SwitchingWorkspaceLoading() {
  const [mounted, setMounted] = useState(false);

  // Intentional: sets mounted=true once on the client after hydration for SSR-safe portal
  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-955/60 backdrop-blur-sm flex items-center justify-center select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xs w-full text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-250">
        {/* Pulsing Outer Ring with Loader */}
        <div className="relative flex items-center justify-center">
          {/* Animated decorative rings */}
          <div className="absolute w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin duration-1000" />
          <div className="absolute w-12 h-12 rounded-full border border-amber-500/10 border-b-amber-500 animate-spin duration-700 [animation-direction:reverse]" />

          {/* Central Icon container */}
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 z-10">
            <Loader2 className="w-5 h-5 animate-spin stroke-[2.5]" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-black text-slate-100 tracking-tight">
            Switching Workspace
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Preparing your dashboard, projects, and tasks...
          </p>
        </div>

        {/* Premium linear loading bar */}
        <div className="w-full h-1 bg-slate-955 rounded-full overflow-hidden shrink-0 border border-slate-800/40">
          <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 w-full rounded-full animate-loading-bar" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
