import React, { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CreateColumnModalProps {
  isOpen: boolean
  onClose: () => void
  isPending: boolean
  onCreate: (name: string) => void
}

export function CreateColumnModal({
  isOpen,
  onClose,
  isPending,
  onCreate,
}: CreateColumnModalProps) {
  const [name, setName] = useState("")

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!name.trim()) return
    onCreate(name.trim())
    setName("")
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Create New Column</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Column Name
            </label>
            <input
              type="text"
              placeholder="e.g. In Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-800 bg-slate-955 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit()
                if (e.key === "Escape") onClose()
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-955 text-xs font-black cursor-pointer"
          >
            {isPending ? "Adding..." : "Add Column"}
          </Button>
        </div>
      </div>
    </div>
  )
}
