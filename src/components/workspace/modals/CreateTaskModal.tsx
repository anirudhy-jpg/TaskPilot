import React, { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TaskStatus, WorkspaceMember, Task } from "@/types/workspace.types"
import { AssigneeSelector } from "../AssigneeSelector"

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  isPending: boolean
  initialStatus: TaskStatus
  members: WorkspaceMember[]
  currentUserId?: string
  onCreate: (title: string, description?: string, status?: TaskStatus, assigneeId?: string) => void
}

export function CreateTaskModal({
  isOpen,
  onClose,
  projectName,
  isPending,
  initialStatus,
  members,
  currentUserId,
  onCreate,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [assigneeId, setAssigneeId] = useState("")

  if (!isOpen) return null

  const selectedMember = members.find((m) => m.userId === assigneeId)
  const mockTask = {
    id: "new-task-temp-id",
    assigneeId: assigneeId || null,
    assignee: selectedMember?.profile
      ? {
          fullName: selectedMember.profile.fullName,
          email: selectedMember.profile.email,
          avatarUrl: selectedMember.profile.avatarUrl,
        }
      : null,
  } as any

  const handleAssigneeChange = (_taskId: string, newAssigneeId: string | null) => {
    setAssigneeId(newAssigneeId || "")
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    onCreate(
      title.trim(),
      desc.trim() || undefined,
      status,
      assigneeId || undefined
    )
    setTitle("")
    setDesc("")
    setAssigneeId("")
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Assignee
              </label>
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-slate-200 bg-white min-h-[38px]">
                <div className="relative z-10">
                  <AssigneeSelector
                    task={mockTask}
                    members={members}
                    currentUserId={currentUserId}
                    onChange={handleAssigneeChange}
                    size="large"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-slate-700 truncate">
                    {mockTask.assignee ? (mockTask.assignee.fullName || "Name not set") : "Unassigned"}
                  </span>
                  {mockTask.assignee?.email && (
                    <span className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                      {mockTask.assignee.email}
                    </span>
                  )}
                </div>
              </div>
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
