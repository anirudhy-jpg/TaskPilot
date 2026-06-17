import React, { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Project } from "../../types/project.types"

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  isPending: boolean
  project: Project | null
  onUpdate: (name: string, description?: string) => void
}

export function EditProjectModal({
  isOpen,
  onClose,
  isPending,
  project,
  onUpdate,
}: EditProjectModalProps) {
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDesc(project.description || "")
    }
  }, [project, isOpen])

  if (!isOpen || !project) return null

  const handleSubmit = () => {
    if (!name.trim()) return
    onUpdate(name.trim(), desc.trim() || undefined)
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
          <h3 className="text-base font-bold text-slate-100">Edit Project Details</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Project Name
            </label>
            <input
              type="text"
              placeholder="e.g. AI Model Orchestrator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-800 bg-slate-955 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Description (optional)
            </label>
            <textarea
              placeholder="Provide a brief summary of the project..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-800 bg-slate-955 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
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
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
