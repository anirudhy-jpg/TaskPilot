import React, { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TaskStatus } from "@/types/workspace.types"

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  isPending: boolean
  initialStatus: TaskStatus
  onCreate: (title: string, description?: string, status?: TaskStatus) => void
}

export function CreateTaskModal({
  isOpen,
  onClose,
  projectName,
  isPending,
  initialStatus,
  onCreate,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [status, setStatus] = useState<TaskStatus>(initialStatus)

  // Sync status when initialStatus changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus(initialStatus)
    }
  }, [initialStatus, isOpen])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!title.trim()) return
    onCreate(title.trim(), desc.trim() || undefined, status)
    setTitle("")
    setDesc("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create New Task</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Adding to: {projectName}
            </p>
          </div>
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
              Task Title
            </label>
            <input
              type="text"
              placeholder="e.g. Write API integration tests"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2d4a3e]/20 focus:border-[#2d4a3e]"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Description (optional)
            </label>
            <textarea
              placeholder="Describe what needs to be done..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2d4a3e]/20 focus:border-[#2d4a3e] resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2d4a3e]/20 focus:border-[#2d4a3e] cursor-pointer"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
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
            disabled={isPending || !title.trim()}
            className="bg-[#2d4a3e] hover:bg-[#1e3a2e] text-white text-xs font-bold cursor-pointer"
          >
            {isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </div>
    </div>
  )
}
