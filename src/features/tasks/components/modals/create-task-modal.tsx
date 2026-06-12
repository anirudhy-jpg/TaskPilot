import React, { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { TaskStatus, TaskPriority, Column } from "@/features/project/types/project.types"

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  isPending: boolean
  initialStatus: string
  columns: Column[]
  onCreate: (
    title: string,
    description?: string,
    status?: string,
    assigneeId?: string,
    priority?: TaskPriority
  ) => void
}

const priorityOptions = [
  { value: "low", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "Hard" },
]

export function CreateTaskModal({
  isOpen,
  onClose,
  projectName,
  isPending,
  initialStatus,
  columns,
  onCreate,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [status, setStatus] = useState<string>(initialStatus)
  const [priority, setPriority] = useState<TaskPriority>("medium")

  const statusOptions = columns.map((col) => ({
    value: col.id,
    label: col.name,
  }))


  if (!isOpen) return null

  const handleSubmit = () => {
    if (!title.trim()) return
    onCreate(
      title.trim(),
      desc.trim() || undefined,
      status,
      undefined,
      priority
    )
    setTitle("")
    setDesc("")
    setPriority("medium")
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
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Task Title
            </label>
            <input
              type="text"
              placeholder="e.g. Write API integration tests"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Initial Status
              </label>
              <Select
                value={status}
                onChange={(val) => setStatus(val)}
                options={statusOptions}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Priority
              </label>
              <Select
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={priorityOptions}
              />
            </div>
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
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
          >
            {isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </div>
    </div>
  )
}
