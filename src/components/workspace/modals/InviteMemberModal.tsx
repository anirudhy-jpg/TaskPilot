import React, { useState } from "react"
import { X, Check, Shield, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { Project } from "@/types/workspace.types"

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  isPending: boolean
  onInvite: (email: string, role: "admin" | "member", projectId?: string | null) => Promise<string | null>
  projects?: Project[]
}

export function InviteMemberModal({
  isOpen,
  onClose,
  isPending,
  onInvite,
  projects = [],
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!email.trim()) return
    setError(null)
    try {
      const url = await onInvite(email.trim(), role, selectedProjectId || null)
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
    setSelectedProjectId("")
    setIsSuccess(false)
    setError(null)
    onClose()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleReset()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {isSuccess ? "Success!" : "Invite New Member"}
          </h3>
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3 text-center font-medium">
            {error}
          </div>
        )}

        {!isSuccess ? (
          /* Input Form */
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                autoFocus
                disabled={isPending}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">
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
                      ? "border-amber-500 bg-amber-500/5 text-slate-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <User size={13} className={role === "member" ? "text-amber-600" : "text-slate-400"} />
                    Member
                  </div>
                  <span className="text-[10px] text-slate-450 mt-1 leading-normal">
                    Can view projects, update tasks, and collaborate.
                  </span>
                </button>

                {/* Admin Option */}
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  disabled={isPending}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "admin"
                      ? "border-amber-500 bg-amber-500/5 text-slate-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Shield size={13} className={role === "admin" ? "text-amber-600" : "text-slate-400"} />
                    Admin
                  </div>
                  <span className="text-[10px] text-slate-450 mt-1 leading-normal">
                    Full workspace access, manages settings and members.
                  </span>
                </button>
              </div>
            </div>

            {/* Project Selection for Members */}
            {projects.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Assign to Project (Optional)
                </label>
                <Select
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  options={[
                    { value: "", label: "No initial project assignment" },
                    ...projects.map((project) => ({
                      value: project.id,
                      label: project.name,
                    })),
                  ]}
                  disabled={isPending}
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Assigning a project restricts a regular workspace member to only see the selected project.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
                className="text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || !email.trim() || !email.includes("@")}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5">
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
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <Check size={22} className="stroke-[3]" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                Send invitation successfully
              </div>
              <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed">
                An invitation email notification has been generated for <span className="font-semibold text-slate-700">{email}</span>.
              </p>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <Button
                size="sm"
                onClick={handleReset}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer w-full"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
