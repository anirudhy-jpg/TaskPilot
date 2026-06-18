import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Briefcase, ShieldCheck, User, Check, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Workspace } from "../../types/workspace.types"

interface SwitchWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  currentUserId: string
  onSwitchWorkspace: (workspaceId: string) => Promise<void>
}

export function SwitchWorkspaceModal({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  currentUserId,
  onSwitchWorkspace,
}: SwitchWorkspaceModalProps) {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  // Filter workspaces based on search query
  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ownedWorkspaces = filteredWorkspaces.filter((w) => w.ownerId === currentUserId)
  const memberWorkspaces = filteredWorkspaces.filter((w) => w.ownerId !== currentUserId)

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      onClose()
      return
    }
    setSwitchingId(workspaceId)
    setErrorMsg(null)
    try {
      await onSwitchWorkspace(workspaceId)
      onClose()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to switch workspace.")
      setSwitchingId(null)
    }
  }

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none"
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Briefcase size={18} className="text-amber-550" />
              <span>Switch Workspace</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an active workspace to view its projects and tasks.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs rounded-lg p-3 text-center font-medium shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Search Filter */}
        {workspaces.length > 5 && (
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-955 border-slate-800 text-slate-200 text-xs rounded-xl focus-visible:ring-amber-500/20 focus-visible:border-amber-500 h-9"
            />
          </div>
        )}

        {/* Workspaces Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin max-h-[300px]">
          {/* Owned Workspaces */}
          {ownedWorkspaces.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                Your Workspaces
              </div>
              <div className="space-y-1">
                {ownedWorkspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId
                  const isSwitching = switchingId === ws.id
                  return (
                    <button
                      key={ws.id}
                      disabled={switchingId !== null}
                      onClick={() => handleSwitch(ws.id)}
                      className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
                        isActive
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-350"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black shrink-0 ${
                          isActive ? "bg-amber-500 text-slate-950" : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {ws.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate pr-2">{ws.name}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                          <ShieldCheck size={9} />
                          Owner
                        </span>
                        {isSwitching ? (
                          <Loader2 size={12} className="animate-spin text-amber-500" />
                        ) : isActive ? (
                          <Check size={14} className="text-amber-500 shrink-0" />
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Member Workspaces */}
          {memberWorkspaces.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                Shared Workspaces
              </div>
              <div className="space-y-1">
                {memberWorkspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId
                  const isSwitching = switchingId === ws.id
                  return (
                    <button
                      key={ws.id}
                      disabled={switchingId !== null}
                      onClick={() => handleSwitch(ws.id)}
                      className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
                        isActive
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-350"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black shrink-0 ${
                          isActive ? "bg-amber-500 text-slate-950" : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {ws.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate pr-2">{ws.name}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          <User size={9} />
                          Member
                        </span>
                        {isSwitching ? (
                          <Loader2 size={12} className="animate-spin text-amber-500" />
                        ) : isActive ? (
                          <Check size={14} className="text-amber-500 shrink-0" />
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {filteredWorkspaces.length === 0 && (
            <p className="text-[11px] text-slate-500 italic py-6 text-center">
              No workspaces found.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
