import React from "react"
import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  type: "project" | "task" | "member"
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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-red-600">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {type === "member" ? "Remove Member" : `Delete ${type === "project" ? "Project" : "Task"}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to proceed?</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
          {type === "member" ? (
            <>You are about to remove <strong>&ldquo;{name}&rdquo;</strong> from this workspace. They will lose access to all projects and tasks.</>
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
            onClick={onClose}
            className="text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
          >
            {isPending
              ? (type === "member" ? "Removing..." : "Deleting...")
              : type === "member"
                ? "Remove Member"
                : `Delete ${type === "project" ? "Project" : "Task"}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
