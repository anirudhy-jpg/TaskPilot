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
import type { Project, Task } from "../../project/types/project.types";
import { EvictedModal } from "./modals/evicted-modal";
import type { Workspace } from "../types/workspace.types";
import type { UserProfile } from "@/features/auth/types/profile.types";

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

    return () => {
      supabase.removeChannel(channel);
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
              status?: string;
              column_id?: string;
              priority?: string;
              position?: number;
              assigned_to?: string | null;
              created_at?: string;
              due_date?: string | null;
            };
            const r = newRow as RealtimeTaskRow;
            const newTask: Task = {
              id: r.id,
              projectId: r.project_id,
              title: r.title,
              description: r.description || null,
              status: r.status || "todo",
              columnId: r.column_id || r.status || "",
              priority: (r.priority as "low" | "medium" | "high") || "medium",
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
              status?: string;
              column_id?: string;
              priority?: string;
              position?: number;
              assigned_to?: string | null;
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
                      status: r.status || t.status,
                      columnId: r.column_id || r.status || t.columnId,
                      priority: (r.priority as "low" | "medium" | "high") || t.priority,
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

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Automatically close sidebar when navigation/content changes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileSidebarOpen(false);
  }

  return (
    <div className="h-screen bg-[#0b0f19] text-white flex flex-col font-sans w-full relative overflow-hidden">
      {/* Ambient glows (Subtle, premium amber and dark slate accents) */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/3 blur-[120px] pointer-events-none" />

      {/* ── Navbar ─────────────────────────────────────────── */}
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

      {/* ── Main Area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden w-full relative z-10">
        {/* Desktop Sidebar */}
        <Sidebar
          workspaceName={localWorkspaceName}
          projects={localProjects}
          ownerEmail={ownerEmail}
          variant="desktop"
        />

        {/* Mobile Sidebar Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Drawer */}
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
              />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-hidden bg-transparent flex flex-col relative w-full min-w-0">
          {children}
        </main>
      </div>

      <EvictedModal isOpen={isEvicted} />
    </div>
  );
}
