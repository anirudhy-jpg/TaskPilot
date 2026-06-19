import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, UserPlus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"

interface ManageProjectMembersModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  currentMembers: WorkspaceMember[]
  eligibleMembers: WorkspaceMember[]
  onAddMember: (userId: string) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
}

export function ManageProjectMembersModal({
  isOpen,
  onClose,
  // Removed unused projectId
  projectName,
  currentMembers,
  eligibleMembers,
  onAddMember,
  onRemoveMember,
}: ManageProjectMembersModalProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const handleAdd = async () => {
    if (!selectedUserId) return
    setIsAdding(true)
    setErrorMsg(null)
    try {
      await onAddMember(selectedUserId)
      setSelectedUserId("")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add member.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (userId: string) => {
    setRemovingUserId(userId)
    setErrorMsg(null)
    try {
      await onRemoveMember(userId)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to remove member.")
    } finally {
      setRemovingUserId(null)
    }
  }

  return createPortal(
    <div
      onClick={(e) => {
        const isPending = isAdding || removingUserId !== null;
        if (e.target === e.currentTarget && !isPending) onClose()
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">Manage Project Members</h3>
            <p className="text-xs text-slate-400 mt-0.5">Project: <span className="font-semibold text-slate-200">{projectName}</span></p>
          </div>
          <button
            onClick={() => {
              const isPending = isAdding || removingUserId !== null;
              if (!isPending) onClose();
            }}
            disabled={isAdding || removingUserId !== null}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg p-3 text-center font-medium animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Add Member Section */}
        <div className="space-y-2 bg-slate-950 border border-slate-850 p-4 rounded-xl">
          <label className="text-xs font-bold text-slate-400 block">
            Add Existing Workspace Member
          </label>
          <div className="flex gap-2">
            <Select
              value={selectedUserId}
              onChange={setSelectedUserId}
              options={eligibleMembers.map((m) => ({
                value: m.userId,
                label: `${m.profile?.fullName || m.profile?.email || m.userId} (${m.profile?.email || "No email"})`,
              }))}
              placeholder={
                eligibleMembers.length === 0
                  ? "All workspace members are assigned"
                  : "Select a member..."
              }
              disabled={isAdding || eligibleMembers.length === 0}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isAdding || !selectedUserId}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              {isAdding ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <UserPlus size={13} />
              )}
              Add
            </Button>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Assigned Project Members ({currentMembers.length})
          </label>
          
          {currentMembers.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic py-2 text-center">
              No members assigned to this project yet.
            </p>
          ) : (
            <div className="max-h-[200px] overflow-y-auto border border-slate-850 rounded-xl divide-y divide-slate-850 scrollbar-thin">
              {currentMembers.map((member) => {
                const displayName = member.profile?.fullName || member.profile?.email || "?"
                const email = member.profile?.email || "No email"
                const isOwner = member.role === "owner"
                const isAdmin = member.role === "admin"

                return (
                  <div key={member.userId} className="flex items-center justify-between p-3 hover:bg-slate-950/40 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {displayName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                          <span>{displayName}</span>
                          {isOwner && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1 rounded font-bold shrink-0">
                               Owner
                            </span>
                          )}
                          {isAdmin && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1 rounded font-bold shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {email}
                        </div>
                      </div>
                    </div>

                    {!isOwner && !isAdmin && (
                      <button
                        onClick={() => handleRemove(member.userId)}
                        disabled={removingUserId !== null || isAdding}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                        title="Remove member from project"
                      >
                        {removingUserId === member.userId ? (
                          <Loader2 size={13} className="animate-spin text-slate-500" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <Button
            size="sm"
            onClick={() => {
              const isPending = isAdding || removingUserId !== null;
              if (!isPending) onClose();
            }}
            disabled={isAdding || removingUserId !== null}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer w-full"
          >
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
