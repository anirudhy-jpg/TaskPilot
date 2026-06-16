"use client"

import React, { useState, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { Shield, Crown, User, UserPlus, Trash2, Clock, Loader2, MoreVertical } from "lucide-react"
import type { WorkspaceMember, MemberRole } from "../types/workspace.types"
import type { Project } from "@/features/project/types/project.types"
import type { Invitation } from "../services/invite.service"
import { InviteMemberModal } from "./modals/invite-member-modal"
import { createInvitationAction } from "../actions/create-invitation.action"
import { revokeInvitationAction } from "../actions/revoke-invitation.action"
import { removeWorkspaceMemberAction } from "../actions/remove-workspace-member.action"
import { DeleteConfirmModal } from "./modals/delete-confirm-modal"
import { Button } from "@/components/ui/button"
import { useMembersRealtime } from "../hooks/use-members-realtime"
import { useInvitationsRealtime } from "../hooks/use-invitations-realtime"
import { createClient } from "@/lib/supabase/client"
import { Pagination } from "@/components/ui/pagination"
import { MemberDetailsModal } from "./modals/member-details-modal"

function ClientDate({ dateString }: { dateString: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  if (!mounted) {
    return <span className="opacity-0">...</span>
  }

  return <>{new Date(dateString).toLocaleDateString()}</>
}

interface MembersListProps {
  workspaceId: string
  members: WorkspaceMember[]
  pendingInvitations: Invitation[]
  canInvite: boolean
  currentUserRole: MemberRole
  currentUserId: string
  projects?: Project[]
}

const roleConfig: Record<
  MemberRole,
  { label: string; color: string; bgColor: string; icon: typeof Shield }
> = {
  owner: {
    label: "Owner",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-100",
    icon: Crown,
  },
  admin: {
    label: "Admin",
    color: "text-slate-800",
    bgColor: "bg-slate-100 border-slate-200",
    icon: Shield,
  },
  member: {
    label: "Member",
    color: "text-slate-655",
    bgColor: "bg-slate-50 border-slate-100",
    icon: User,
  },
}

export function MembersList({
  workspaceId,
  members,
  pendingInvitations,
  canInvite,
  currentUserRole,
  currentUserId,
  projects = [],
}: MembersListProps) {
  const [localMembers, setLocalMembers] = useState(members)
  const [localInvitations, setLocalInvitations] = useState(pendingInvitations)
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null)

  useEffect(() => {
    setLocalMembers(members)
  }, [members])

  useEffect(() => {
    setLocalInvitations(pendingInvitations)
  }, [pendingInvitations])

  // Realtime subscriptions
  useMembersRealtime({
    workspaceId,
    members: localMembers,
    setMembers: setLocalMembers,
    currentUserId,
  })

  useInvitationsRealtime({
    workspaceId,
    invitations: localInvitations,
    setInvitations: setLocalInvitations,
  })

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<{ id: string; userId: string; name: string } | null>(null)

  // Pagination state and logic
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const totalItems = localMembers.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // Click outside to close options dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeMenuId && !(event.target as Element).closest(".member-menu-container")) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [activeMenuId])

  const sortedMembers = [...localMembers].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    return (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2)
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedMembers = sortedMembers.slice(startIndex, startIndex + itemsPerPage)

  const handleInviteSubmit = async (
    email: string,
    role: "admin" | "member",
    projectIds: string[]
  ): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const res = await createInvitationAction(workspaceId, email, role, projectIds)
          if (res.success && res.data) {
            resolve(res.data)
          } else {
            reject(new Error(res.error || "Failed to create invitation."))
          }
        } catch (err: unknown) {
          reject(err)
        }
      })
    })
  }

  const handleRevoke = (inviteId: string) => {
    setRevokingId(inviteId)
    startTransition(async () => {
      try {
        await revokeInvitationAction(inviteId)
      } catch (err) {
        console.error("Failed to revoke invitation:", err)
      } finally {
        setRevokingId(null)
      }
    })
  }

  const handleRemoveMember = (memberId: string, userId: string, name: string) => {
    setActiveMenuId(null)
    setRemovingMember({ id: memberId, userId, name })
  }

  const confirmRemoveMember = () => {
    if (!removingMember) return
    startTransition(async () => {
      try {
        const res = await removeWorkspaceMemberAction(workspaceId, removingMember.id)
        if (res.success) {
          // Broadcast the eviction event so the member is kicked out instantly
          const supabase = createClient()
          const channel = supabase.channel(`room:${workspaceId}`)
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              channel.send({
                type: "broadcast",
                event: "evict",
                payload: {
                  userId: removingMember.userId,
                  memberId: removingMember.id,
                },
              }).then(() => {
                supabase.removeChannel(channel)
              })
            }
          })
        } else {
          alert(res.error || "Failed to remove member.")
        }
      } catch (err) {
        console.error("Error removing member:", err)
        alert("An unexpected error occurred.")
      } finally {
        setRemovingMember(null)
      }
    })
  }

  return (
    <div className={`space-y-8 relative transition-all duration-300 ${isPending ? "opacity-75 pointer-events-none filter blur-[0.3px]" : ""}`}>
      {/* Premium top linear loading bar showing sync state */}
      {isPending && typeof window !== "undefined" && createPortal(
        <div className="fixed top-14 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-yellow-500 z-40 overflow-hidden">
          <div className="h-full bg-amber-450 animate-pulse w-full" />
        </div>,
        document.body
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/10 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl">
            Workspace Members
          </h1>
          <p className="text-xs text-slate-550 mt-0.5">
            Manage your workspace members, roles, and pending invitations.
          </p>
        </div>
        {canInvite && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsInviteOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-955 text-xs font-black py-2 px-4 rounded-xl flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-3xs transition-all active:scale-[0.98] h-10 border-0"
            >
              <UserPlus size={15} />
              Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Active Members Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Active Members ({localMembers.length})
          </h3>
        </div>

        {sortedMembers.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white/70 backdrop-blur-md border border-amber-900/5 text-center">
            <div className="text-3xl mb-3">👤</div>
            <p className="text-sm text-slate-500 font-medium">No members found</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedMembers.map((member) => {
                const cfg = roleConfig[member.role] || roleConfig.member
                const RoleIcon = cfg.icon
                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className="p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-amber-900/5 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.03)] hover:shadow-[0_12px_24px_-8px_rgba(245,158,11,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-[124px] cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700 text-sm font-extrabold uppercase shrink-0">
                          {member.profile?.fullName?.[0] ||
                            member.profile?.email?.[0] ||
                            "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {member.profile?.fullName || "Active User"}
                          </p>
                          <p className="text-xs text-slate-450 truncate mt-0.5">
                            {member.profile?.email || member.userId}
                          </p>
                        </div>
                      </div>

                      {currentUserRole === "owner" && member.userId !== currentUserId && (
                        <div className="relative member-menu-container shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenuId(activeMenuId === member.id ? null : member.id)
                            }}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeMenuId === member.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white border border-amber-900/10 rounded-xl shadow-lg py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveMember(member.id, member.userId, member.profile?.fullName || member.profile?.email || "this member")
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-655 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2"
                              >
                                <Trash2 size={13} />
                                Remove member
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Role badge + join date */}
                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-amber-955/10">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.bgColor} ${cfg.color}`}
                      >
                        <RoleIcon size={10} />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Joined{" "}
                        {member.joinedAt ? (
                          <ClientDate dateString={member.joinedAt} />
                        ) : (
                          "N/A"
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              itemName="members"
            />
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {localInvitations.length > 0 && (
        <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Pending Invitations ({localInvitations.length})
            </h3>
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-amber-900/5 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="divide-y divide-amber-955/10">
              {localInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 capitalize px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                          {invite.role}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Pending
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Invited on <ClientDate dateString={invite.createdAt} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {canInvite && (
                    <Button
                      variant="ghost"
                      onClick={() => handleRevoke(invite.id)}
                      disabled={revokingId === invite.id}
                      className="text-xs text-red-650 hover:text-red-800 hover:bg-red-50 font-bold self-start sm:self-auto cursor-pointer flex items-center gap-1.5 h-9 rounded-lg border-0"
                    >
                      {revokingId === invite.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {canInvite && (
        <InviteMemberModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          isPending={isPending}
          onInvite={handleInviteSubmit}
          projects={projects}
        />
      )}

      {/* Remove Member Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!removingMember}
        onClose={() => setRemovingMember(null)}
        type="member"
        name={removingMember?.name || ""}
        isPending={isPending}
        onConfirm={confirmRemoveMember}
      />

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        workspaceId={workspaceId}
      />
    </div>
  )
}
