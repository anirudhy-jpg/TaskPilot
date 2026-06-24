import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Trash2, DoorOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  type: "project" | "task" | "subtask" | "member" | "workspace" | "leave_workspace" | "delete_workspace" | "attachment" | "time_log"
  name: string
  isPending: boolean
  onConfirm: () => void
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  type,
  name,
  isPending,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!isOpen) return null
  if (!mounted) return null

  const isLeave = type === "workspace" || type === "leave_workspace"

  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !isPending) onClose()
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
            {isLeave ? (
              <DoorOpen size={20} className="text-rose-500" />
            ) : (
              <Trash2 size={20} className="text-rose-500" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {type === "member"
                ? "Remove Member"
                : type === "leave_workspace" || type === "workspace"
                  ? "Leave Workspace"
                  : type === "delete_workspace"
                    ? "Delete Workspace"
                    : type === "attachment"
                      ? "Delete Attachment"
                      : type === "time_log"
                        ? "Delete Time Log"
                        : `Delete ${type === "project" ? "Project" : type === "subtask" ? "Subtask" : "Task"}`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Are you sure you want to proceed?</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-850">
          {type === "member" ? (
            <>You are about to remove <strong>&ldquo;{name}&rdquo;</strong> from this workspace. They will lose access to all projects and tasks.</>
          ) : type === "leave_workspace" || type === "workspace" ? (
             <>You are about to leave the workspace <strong>&ldquo;{name}&rdquo;</strong>. You will lose access to all of its projects, boards, and tasks.</>
          ) : type === "delete_workspace" ? (
            <>You are about to permanently delete the workspace <strong>&ldquo;{name}&rdquo;</strong>. This action is irreversible and will delete all associated projects, tasks, and members.</>
          ) : type === "attachment" ? (
            <>You are about to permanently delete the attachment <strong>&ldquo;{name}&rdquo;</strong>. This action cannot be undone.</>
          ) : type === "subtask" ? (
            <>You are about to permanently delete the subtask <strong>&ldquo;{name}&rdquo;</strong>. This action cannot be undone.</>
          ) : type === "time_log" ? (
            <>You are about to permanently delete this time log. This action cannot be undone.</>
          ) : (
            <>You are about to delete <strong>&ldquo;{name}&rdquo;</strong>. This will
          permanently remove it from the workspace.{" "}
          {type === "project" && "All associated tasks will also be deleted."}</>
          )}
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
            {isPending
              ? (type === "member" ? "Removing..." : type === "delete_workspace" ? "Deleting..." : type === "leave_workspace" || type === "workspace" ? "Leaving..." : "Deleting...")
              : type === "member"
                ? "Remove Member"
                : type === "leave_workspace" || type === "workspace"
                  ? "Leave Workspace"
                  : type === "delete_workspace"
                    ? "Delete Workspace"
                    : type === "attachment"
                      ? "Delete Attachment"
                    : type === "time_log"
                      ? "Delete Time Log"
                      : `Delete ${type === "project" ? "Project" : type === "subtask" ? "Subtask" : "Task"}`}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
