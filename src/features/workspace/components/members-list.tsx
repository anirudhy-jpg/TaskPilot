"use client"

import React, { useState, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { UserPlus, Trash2, Clock, Loader2, MoreHorizontal } from "lucide-react"
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

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const roleConfig: Record<
  MemberRole,
  { label: string; className: string }
> = {
  owner: {
    label: "Owner",
    className: "bg-amber-500/10 text-amber-500 border border-amber-500/25",
  },
  admin: {
    label: "Admin",
    className: "bg-amber-500/10 text-amber-500 border border-amber-500/25",
  },
  member: {
    label: "Member",
    className: "bg-slate-800 text-slate-300 border border-slate-700",
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

  const [prevMembers, setPrevMembers] = useState(members);
  const [prevInvitations, setPrevInvitations] = useState(pendingInvitations);

  if (members !== prevMembers) {
    setPrevMembers(members);
    setLocalMembers(members);
  }

  if (pendingInvitations !== prevInvitations) {
    setPrevInvitations(pendingInvitations);
    setLocalInvitations(pendingInvitations);
  }

  // Realtime subscriptions
  useMembersRealtime({
    workspaceId,
    setMembers: setLocalMembers,
    currentUserId,
  })

  useInvitationsRealtime({
    workspaceId,
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

  const [prevTotalPages, setPrevTotalPages] = useState(totalPages);

  if (totalPages !== prevTotalPages) {
    setPrevTotalPages(totalPages);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }

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
    <div className={`flex flex-col h-full min-h-0 w-full relative transition-all duration-300 ${isPending ? "opacity-75 pointer-events-none filter blur-[0.3px]" : ""}`}>
      {/* Premium top linear loading bar showing sync state */}
      {isPending && typeof window !== "undefined" && createPortal(
        <div className="fixed top-14 left-0 right-0 h-1 bg-slate-950 z-40 overflow-hidden">
          <div className="h-full bg-amber-500 animate-pulse w-full" />
        </div>,
        document.body
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight sm:text-2xl">
            Workspace Members
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your workspace members, roles, and pending invitations.
          </p>
        </div>
        {canInvite && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsInviteOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm transition-all active:scale-[0.98] h-10 border-0"
            >
              <UserPlus size={15} />
              Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6 pr-1 space-y-8 scrollbar-thin">
        {/* Active Members Card Container */}
      <div className="space-y-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/20 rounded-t-xl">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Active Members ({localMembers.length})
            </h3>
          </div>

          {sortedMembers.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-b-xl">
              <div className="text-3xl mb-3">👤</div>
              <p className="text-sm text-slate-400 font-medium">No members found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {paginatedMembers.map((member, index) => {
                const cfg = roleConfig[member.role] || roleConfig.member
                const initials = member.profile?.fullName 
                  ? getInitials(member.profile.fullName) 
                  : getInitials(member.profile?.email || "?")
                const isLast = index === paginatedMembers.length - 1
                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-all duration-300 cursor-pointer ${
                      isLast ? "rounded-b-xl" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-slate-955 text-slate-200 border border-slate-800 flex items-center justify-center text-sm font-extrabold uppercase shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">
                          {member.profile?.fullName || "Active User"}
                        </p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {member.profile?.email || member.userId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 self-end sm:self-auto">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full ${cfg.className}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        Joined{" "}
                        {member.joinedAt ? (
                          <ClientDate dateString={member.joinedAt} />
                        ) : (
                          "N/A"
                        )}
                      </span>

                      {currentUserRole === "owner" && member.userId !== currentUserId && (
                        <div className="relative member-menu-container shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenuId(activeMenuId === member.id ? null : member.id)
                            }}
                            className="p-1 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {activeMenuId === member.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-slate-950 border border-slate-800 rounded-lg shadow-lg py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveMember(member.id, member.userId, member.profile?.fullName || member.profile?.email || "this member")
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-2"
                              >
                                <Trash2 size={13} />
                                Remove member
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pt-2">
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

      {/* Pending Invitations Card Container */}
      <div className="space-y-4 pt-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-955/20 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Pending Invitations
            </h3>
            {canInvite && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className="text-xs text-slate-400 hover:text-slate-200 font-semibold transition-colors cursor-pointer"
              >
                + Send new
              </button>
            )}
          </div>

          {localInvitations.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800 mb-3">
                <Clock size={16} />
              </div>
              <p className="text-xs text-slate-400 font-medium">No pending invitations.</p>
              {canInvite && (
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="text-xs text-amber-500 font-bold hover:underline mt-1 cursor-pointer flex items-center gap-1"
                >
                  Invite a teammate &rarr;
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {localInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-slate-400 border border-slate-800 flex items-center justify-center shrink-0">
                      <Clock size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-200 truncate">
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center text-[10px] font-bold text-slate-400 capitalize px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                          {invite.role}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
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
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold self-start sm:self-auto cursor-pointer flex items-center gap-1.5 h-9 rounded-lg border-0"
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
          )}
        </div>
      </div>

      </div>

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
