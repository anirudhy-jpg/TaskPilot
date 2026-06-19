"use client"

import React, { useEffect, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/features/auth/actions/logout.action"

interface SignOutConfirmModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SignOutConfirmModal({ isOpen, onClose }: SignOutConfirmModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Intentional: sets mounted=true once on the client after hydration for SSR-safe portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!isOpen) return null
  if (!mounted) return null

  const handleConfirm = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

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
            <LogOut size={20} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Sign Out</h3>
            <p className="text-xs text-slate-400 mt-0.5">Are you sure you want to proceed?</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-850">
          You are about to sign out of your account. You will need to log back in to access your workspaces and tasks.
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
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
          >
            {isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
