import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { DoorOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LeaveWorkspaceConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  name: string
  isPending: boolean
  onConfirm: () => void
}

export function LeaveWorkspaceConfirmModal({
  isOpen,
  onClose,
  name,
  isPending,
  onConfirm,
}: LeaveWorkspaceConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  // Intentional: sets mounted=true once on the client after hydration for SSR-safe portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!isOpen) return null
  if (!mounted) return null

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose()
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
            <DoorOpen size={20} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Leave Workspace</h3>
            <p className="text-xs text-slate-400 mt-0.5">Are you sure you want to proceed?</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-850">
          You are about to leave the workspace <strong>&ldquo;{name}&rdquo;</strong>. You will lose access to all of its projects, boards, and tasks.
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => !isPending && onClose()}
            disabled={isPending}
            className="text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
          >
            {isPending ? "Leaving..." : "Leave Workspace"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
