import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Check, Shield, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

import { MultiSelect } from "@/components/ui/multi-select"
import type { Project } from "@/features/project/types/project.types"

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  isPending: boolean
  onInvite: (email: string, role: "admin" | "member", projectIds: string[]) => Promise<string | null>
  projects?: Project[]
}

export function InviteMemberModal({
  isOpen,
  onClose,
  isPending,
  onInvite,
  projects = [],
}: InviteMemberModalProps) {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const handleSubmit = async () => {
    if (!email.trim()) return
    if (role === "member" && projects.length > 0 && selectedProjectIds.length === 0) {
      setShowErrors(true)
      return
    }
    setError(null)
    try {
      const url = await onInvite(email.trim(), role, selectedProjectIds)
      if (url) {
        setIsSuccess(true)
      } else {
        setError("Failed to generate invitation link.")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate invitation link."
      setError(message)
    }
  }

  const handleReset = () => {
    setEmail("")
    setRole("member")
    setSelectedProjectIds([])
    setShowErrors(false)
    setIsSuccess(false)
    setError(null)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">
            {isSuccess ? "Success!" : "Invite New Member"}
          </h3>
          <button
            onClick={() => !isPending && handleReset()}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer border-0"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs rounded-lg p-3 text-center font-medium">
            {error}
          </div>
        )}

        {!isSuccess ? (
          /* Input Form */
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-800 bg-slate-955 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                autoFocus
                disabled={isPending}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Workspace Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Member Option */}
                <button
                  type="button"
                  onClick={() => setRole("member")}
                  disabled={isPending}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "member"
                      ? "border-amber-500 bg-amber-500/10 text-slate-100"
                      : "border-slate-800 bg-slate-955 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <User size={13} className={role === "member" ? "text-amber-500" : "text-slate-500"} />
                    Member
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                    Can view projects, update tasks, and collaborate.
                  </span>
                </button>

                {/* Admin Option */}
                <button
                  type="button"
                  onClick={() => {
                    setRole("admin")
                    setShowErrors(false)
                  }}
                  disabled={isPending}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "admin"
                      ? "border-amber-500 bg-amber-500/10 text-slate-100"
                      : "border-slate-800 bg-slate-955 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Shield size={13} className={role === "admin" ? "text-amber-500" : "text-slate-500"} />
                    Admin
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                    Full workspace access, manages settings and members.
                  </span>
                </button>
              </div>
            </div>

            {/* Project Selection */}
            {projects.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Assign to Projects {role === "member" && <span className="text-rose-500">*</span>}
                </label>
                <MultiSelect
                  value={selectedProjectIds}
                  onChange={(val) => {
                    setSelectedProjectIds(val)
                    if (val.length > 0) setShowErrors(false)
                  }}
                  options={projects.map((project) => ({
                    value: project.id,
                    label: project.name,
                  }))}
                  error={showErrors && role === "member" && selectedProjectIds.length === 0}
                  disabled={isPending}
                  placeholder="Select projects..."
                />
                {showErrors && role === "member" && selectedProjectIds.length === 0 ? (
                  <p className="text-[10px] text-rose-500 mt-1 font-bold animate-in fade-in duration-200">
                    Please select at least one project. Project assignment is compulsory for members.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Workspace members will be restricted to see only their assigned projects.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={isPending}
                className="text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer h-9 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || !email.trim() || !email.includes("@") || (role === "member" && projects.length > 0 && selectedProjectIds.length === 0)}
                className={`text-xs font-bold px-4 h-9 rounded-xl transition-all duration-200 cursor-pointer border-0 ${
                  isPending
                    ? "bg-amber-500 text-slate-950 opacity-90 cursor-wait"
                    : "bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 disabled:opacity-100"
                }`}
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Loader2 size={12} className="animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Success View */
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <Check size={22} className="stroke-[3]" />
              </div>
              <div className="text-sm font-bold text-slate-200">
                Send invitation successfully
              </div>
              <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">
                An invitation email notification has been generated for <span className="font-semibold text-slate-200">{email}</span>.
              </p>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <Button
                onClick={handleReset}
                className="bg-amber-500 hover:bg-amber-600 text-slate-955 text-xs font-black cursor-pointer w-full h-9 rounded-xl border-0"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
