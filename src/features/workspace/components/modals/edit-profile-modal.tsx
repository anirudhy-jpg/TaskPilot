"use client"

import React, { useState, useEffect, useTransition } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UserProfile } from "@/features/auth/types/profile.types"
import { updateProfileAction } from "@/features/auth/actions/update-profile.action"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile | null
  user: {
    email?: string
  }
}

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  user,
}: EditProfileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [fullName, setFullName] = useState(profile?.fullName || "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl || null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Reset form when opened with new profile data
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(profile?.fullName || "")
      setAvatarPreview(profile?.avatarUrl || null)
      setAvatarFile(null)
      setError(null)
    }
  }, [isOpen, profile])

  if (!isOpen || !mounted) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size should be less than 10MB")
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("fullName", fullName)
      if (avatarFile) {
        formData.append("avatar", avatarFile)
      }

      const result = await updateProfileAction(formData)

      if (!result.success) {
        setError(result.error || "Failed to update profile.")
      } else {
        onClose()
      }
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">
            Edit Profile
          </h3>
          <button
            onClick={() => !isPending && onClose()}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center border-2 border-slate-700">
                {avatarPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-slate-500 uppercase">
                    {fullName?.[0] || user.email?.[0] || "?"}
                  </span>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                <ImageIcon size={20} />
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isPending}
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-500 text-center">Click to change picture (Max 10MB)</p>
          </div>

          {/* Full Name Input */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-800 bg-slate-955 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              disabled={isPending}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              className="text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer h-9 px-4 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !fullName.trim()}
              className={`text-xs font-bold px-4 h-9 rounded-xl transition-all duration-200 cursor-pointer border-0 ${
                isPending
                  ? "bg-amber-500 text-slate-950 opacity-90 cursor-wait"
                  : "bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 disabled:opacity-100"
              }`}
            >
              {isPending ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 size={12} className="animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  )
}
