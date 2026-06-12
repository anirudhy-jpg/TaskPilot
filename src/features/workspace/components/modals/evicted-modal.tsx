import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface EvictedModalProps {
  isOpen: boolean
}

export function EvictedModal({ isOpen }: EvictedModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-500 shrink-0">
          <X size={24} className="stroke-[2.5]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-900">
            Removed from Workspace
          </h3>
          <p className="text-xs text-slate-505 leading-relaxed">
            The owner has removed you from this workspace.
          </p>
        </div>

        <div className="bg-amber-50/50 border border-amber-900/5 text-slate-655 text-xs rounded-xl p-3 leading-relaxed w-full">
          You no longer have access to this workspace's projects and tasks. Click the button below to return to your workspaces.
        </div>

        <button
          onClick={() => {
            window.location.href = "/workspaces"
          }}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer shadow-3xs transition-all active:scale-[0.98] h-10 border-0 flex items-center justify-center"
        >
          Back to My Workspaces
        </button>
      </div>
    </div>,
    document.body
  )
}
