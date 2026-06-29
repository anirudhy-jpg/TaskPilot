"use client";

import React, { useState, useEffect } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { useProjectsRealtime } from "../../project/hooks/use-projects-realtime";
import { useWorkspacesRealtime } from "../hooks/use-workspaces-realtime";
import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable";
import { useRouter, usePathname } from "next/navigation";
import type { Project, Task, TaskType } from "../../project/types/project.types";
import { EvictedModal } from "./modals/evicted-modal";
import type { Workspace } from "../types/workspace.types";
import type { UserProfile } from "@/features/auth/types/profile.types";
import { checkUnreadMessagesAction } from "@/features/messages/actions/conversations.action";

interface WorkspaceShellProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  isWorkspaceOwner: boolean;
  workspaceId: string | null;
  workspaceName: string;
  workspaces: Workspace[];
  currentUserId: string;
  projectsWithTasks: (Project & { tasks: Task[] })[];
  ownerEmail: string;
}

export function WorkspaceShell({
  children,
  profile,
  user,
  isWorkspaceOwner,
  workspaceId,
  workspaceName,
  workspaces,
  currentUserId,
  projectsWithTasks,
  ownerEmail,
}: WorkspaceShellProps) {
  const router = useRouter();
  const [localWorkspaceName, setLocalWorkspaceName] = useState(workspaceName);
  const [prevWorkspaceName, setPrevWorkspaceName] = useState(workspaceName);

  if (workspaceName !== prevWorkspaceName) {
    setPrevWorkspaceName(workspaceName);
    setLocalWorkspaceName(workspaceName);
  }

  const [localProjects, setLocalProjects] =
    useState<(Project & { tasks: Task[] })[]>(projectsWithTasks);
  const [prevProjectsWithTasks, setPrevProjectsWithTasks] = useState(projectsWithTasks);

  if (projectsWithTasks !== prevProjectsWithTasks) {
    setPrevProjectsWithTasks(projectsWithTasks);
    setLocalProjects(projectsWithTasks);
  }

  const [localWorkspaces, setLocalWorkspaces] = useState(workspaces);
  const [prevWorkspaces, setPrevWorkspaces] = useState(workspaces);

  if (workspaces !== prevWorkspaces) {
    setPrevWorkspaces(workspaces);
    setLocalWorkspaces(workspaces);
  }

  const [isEvicted, setIsEvicted] = useState(false);
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(null);

  const [prevWorkspaceId, setPrevWorkspaceId] = useState(workspaceId);

  if (workspaceId !== prevWorkspaceId) {
    setPrevWorkspaceId(workspaceId);
    setIsEvicted(false);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as { isLeavingWorkspace?: boolean }).isLeavingWorkspace = false;
    }
  }, [workspaceId]);

  // Get current user's membership row ID to detect eviction via DELETE payload IDs
  useEffect(() => {
    if (!workspaceId || !currentUserId) return;
    const getMyMembership = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (data) {
        setCurrentUserMemberId(data.id);
      }
    };
    getMyMembership();
  }, [workspaceId, currentUserId]);

  // Subscriptions
  useWorkspacesRealtime({
    workspaces: localWorkspaces,
    setWorkspaces: setLocalWorkspaces,
    onWorkspaceUpdate: (updated) => {
      if (updated.id === workspaceId) {
        setLocalWorkspaceName(updated.name);
      }
    },
    onWorkspaceDelete: (deletedId) => {
      if (deletedId === workspaceId) {
        router.push("/workspaces");
        router.refresh();
      }
    },
  });

  useProjectsRealtime({
    workspaceId,
    projects: localProjects,
    setProjects: setLocalProjects as React.Dispatch<
      React.SetStateAction<(Project & { tasks: Task[] })[]>
    >,
  });

  // Eviction listener via database change event
  useRealtimeSubscription({
    table: "workspace_members",
    filter: undefined,
    onPayload: (payload) => {
      const { eventType, old: oldRow } = payload;
      if (eventType === "DELETE" && oldRow) {
        const deletedId = (oldRow as { id?: string }).id;
        if (currentUserMemberId && deletedId === currentUserMemberId) {
          if (
            typeof window !== "undefined" &&
            (window as { isLeavingWorkspace?: boolean }).isLeavingWorkspace
          ) {
            // Voluntary leave, ignore eviction modal
            return;
          }
          setIsEvicted(true);
        }
      }
    },
  });

  // Eviction listener via Broadcast (backup/instant for RLS bypass)
  useEffect(() => {
    if (!workspaceId) return;
    const supabase = createClient();
    const channel = supabase.channel(`room:${workspaceId}`);

    channel
      .on("broadcast", { event: "evict" }, (response) => {
        const { userId, memberId } = response.payload || {};
        if (
          (userId && userId === currentUserId) ||
          (memberId && memberId === currentUserMemberId)
        ) {
          if (
            typeof window !== "undefined" &&
            (window as { isLeavingWorkspace?: boolean }).isLeavingWorkspace
          ) {
            // Voluntary leave, ignore eviction modal
            return;
          }
          setIsEvicted(true);
        }
      })
      .subscribe();

    const userChannel = supabase.channel(`user:${currentUserId}`);
    userChannel
      .on("broadcast", { event: "workspace_membership_revoked" }, (response) => {
        const removedWorkspaceId = response.payload?.workspaceId;
        if (removedWorkspaceId) {
          if (removedWorkspaceId === workspaceId) {
             setIsEvicted(true);
          } else {
             setLocalWorkspaces((prev) => prev.filter(w => w.id !== removedWorkspaceId));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(userChannel);
    };
  }, [workspaceId, currentUserId, currentUserMemberId]);

  useRealtimeSubscription({
    table: "tasks",
    onPayload: (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;

      if (eventType === "DELETE" && oldRow) {
        const deletedTaskId = (oldRow as { id?: string }).id;
        setLocalProjects((prev) =>
          prev.map((proj) => ({
            ...proj,
            tasks: proj.tasks.filter((t) => t.id !== deletedTaskId),
          })),
        );
        return;
      }

      const projectId = (newRow as { project_id?: string })?.project_id;
      if (!projectId) return;

      setLocalProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;

          if (eventType === "INSERT" && newRow) {
            type RealtimeTaskRow = {
              id: string;
              project_id: string;
              title: string;
              description?: string | null;
              column_id?: string;
              priority?: string;
              position?: number;
              assigned_to?: string | null;
              type?: string;
              created_at?: string;
              due_date?: string | null;
            };
            const r = newRow as RealtimeTaskRow;
            const newTask: Task = {
              id: r.id,
              projectId: r.project_id,
              title: r.title,
              description: r.description || null,
              columnId: r.column_id || "",
              priority: (r.priority as "low" | "medium" | "high") || "medium",
              type: (r.type as TaskType) || "task",
              position: typeof r.position === "number" ? r.position : 0,
              assigneeId: r.assigned_to || null,
              createdAt: r.created_at || new Date().toISOString(),
            };
            const exists = proj.tasks.some((t) => t.id === newTask.id);
            if (exists) return proj;
            return {
              ...proj,
              tasks: [...proj.tasks, newTask],
            };
          } else if (eventType === "UPDATE" && newRow) {
            type RealtimeTaskRow = {
              id: string;
              title?: string;
              description?: string | null;
              column_id?: string;
              priority?: string;
              position?: number;
              assigned_to?: string | null;
              type?: string;
              due_date?: string | null;
            };
            const r = newRow as RealtimeTaskRow;
            return {
              ...proj,
              tasks: proj.tasks.map((t) =>
                t.id === r.id
                  ? {
                      ...t,
                      title: r.title || t.title,
                      columnId: r.column_id || t.columnId,
                      priority: (r.priority as "low" | "medium" | "high") || t.priority,
                      type: (r.type as TaskType) || t.type || "task",
                      assigneeId: r.assigned_to || t.assigneeId,
                      dueDate: r.due_date || (t as { dueDate?: string | null }).dueDate,
                      description: r.description || t.description,
                      position:
                        typeof r.position === "number"
                          ? r.position
                          : t.position,
                    }
                  : t,
              ),
            };
          }
          return proj;
        }),
      );
    },
  });

  // Global Chat Listener
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  useEffect(() => {
    // Initial fetch to see if we have any unread messages
    checkUnreadMessagesAction().then((res) => {
      if (res.success && res.data) setHasUnreadMessages(true);
    }).catch(() => {});

    const handleConversationRead = () => {
      checkUnreadMessagesAction().then((res) => {
        if (res.success) setHasUnreadMessages(res.data as boolean);
      }).catch(() => {});
    };

    window.addEventListener('conversation-read', handleConversationRead);
    return () => window.removeEventListener('conversation-read', handleConversationRead);
  }, []);

  useRealtimeSubscription({
    table: "messages",
    onPayload: (payload) => {
      const { eventType, new: newRow } = payload;
      if (eventType === "INSERT" && newRow) {
        type RealtimeMessageRow = {
          id: string;
          sender_id: string;
          content: string;
          conversation_id: string;
        };
        const msg = newRow as RealtimeMessageRow;
        
        // Don't notify if the user sent it themselves
        if (msg.sender_id !== currentUserId) {
          // If the user is actively looking at this conversation, do not show toast or indicator
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof window !== 'undefined' && (window as any).activeConversationId === msg.conversation_id) {
            return;
          }

          const processMessage = async () => {
            const supabase = createClient();
            
            // 1. Verify user is in this conversation
            const { data: memberData } = await supabase
              .from("conversation_members")
              .select("id")
              .eq("conversation_id", msg.conversation_id)
              .eq("user_id", currentUserId)
              .maybeSingle();

            if (!memberData) return; // User is not part of this conversation

            setHasUnreadMessages(true);

            const profileRes = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", msg.sender_id)
              .single();
            
            const sender = profileRes.data;
            const senderName = sender?.full_name || sender?.email || "Someone";
            
            const toast = document.createElement("div");
            // Centered toast at the top
            toast.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 min-w-[300px] max-w-[400px] cursor-pointer hover:bg-slate-800/80 transition-colors";
            
            // Escape HTML to prevent XSS
            const safeContent = msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const contentStr = safeContent.length > 50 ? safeContent.slice(0, 50) + "..." : safeContent;
            
            toast.innerHTML = `
              <div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div class="flex flex-col overflow-hidden w-full">
                <span class="text-[13px] font-bold text-slate-200">${senderName} sent you a message</span>
                <span class="text-xs font-medium text-slate-400 truncate w-full">${contentStr}</span>
              </div>
            `;
            
            toast.onclick = () => {
              router.push("/chat");
              toast.remove();
            };
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
              if (document.body.contains(toast)) {
                toast.style.opacity = "0";
                toast.style.transform = "translate(-50%, -10px)";
                toast.style.transition = "all 0.3s ease-out";
                setTimeout(() => toast.remove(), 300);
              }
            }, 5000);
          };
          
          processMessage();
        }
      }
    }
  });



  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileSidebarOpen(false);
  }

  return (
    <div className="h-screen bg-[#0b0f19] text-white flex flex-col font-sans w-full relative overflow-hidden">
      {/* Ambient glows (Subtle, premium amber and dark slate accents) */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/3 blur-[120px] pointer-events-none" />

      {/* ── Main UI (Hidden when evicted) ──────────────────── */}
      {!isEvicted && (
        <>
          <Header
            profile={profile}
            user={user}
            isWorkspaceOwner={isWorkspaceOwner}
            workspaceId={workspaceId}
            workspaceName={localWorkspaceName}
            workspaces={localWorkspaces}
            currentUserId={currentUserId}
            onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          <div className="flex-1 flex overflow-hidden w-full relative z-10">
            <Sidebar
              workspaceName={localWorkspaceName}
              projects={localProjects}
              ownerEmail={ownerEmail}
              variant="desktop"
              hasMultipleWorkspaces={localWorkspaces.length > 1}
              hasUnreadMessages={hasUnreadMessages}
            />

            {isMobileSidebarOpen && (
              <div className="fixed inset-0 z-50 md:hidden flex">
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
                  onClick={() => setIsMobileSidebarOpen(false)}
                />
                <div className="relative w-64 bg-[#090d16]/95 backdrop-blur-md border-r border-slate-800 flex flex-col z-50 animate-in slide-in-from-left duration-250">
                  <div className="absolute top-4 right-4 z-50">
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent hover:border-slate-850 transition-all cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <Sidebar
                    workspaceName={localWorkspaceName}
                    projects={localProjects}
                    ownerEmail={ownerEmail}
                    variant="mobile"
                    onClose={() => setIsMobileSidebarOpen(false)}
                    hasMultipleWorkspaces={localWorkspaces.length > 1}
                    hasUnreadMessages={hasUnreadMessages}
                  />
                </div>
              </div>
            )}

            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-hidden bg-transparent flex flex-col relative w-full min-w-0">
              {children}
            </main>
          </div>
        </>
      )}

      <EvictedModal isOpen={isEvicted} />
    </div>
  );
}
