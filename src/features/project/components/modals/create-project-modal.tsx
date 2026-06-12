import React, { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  isPending: boolean
  onCreate: (name: string, description?: string) => void
}

export function CreateProjectModal({
  isOpen,
  onClose,
  isPending,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!name.trim()) return
    onCreate(name.trim(), desc.trim() || undefined)
    setName("")
    setDesc("")
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Project Name
            </label>
            <input
              type="text"
              placeholder="e.g. AI Model Orchestrator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Description (optional)
            </label>
            <textarea
              placeholder="Provide a brief summary of the project..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
          >
            {isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </div>
    </div>
  )
}
