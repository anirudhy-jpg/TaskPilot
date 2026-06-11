"use client";

import React, { Suspense } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Circle, Clock, CheckCircle2, X } from "lucide-react";
import type { Project, Task, TaskStatus } from "../types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";

// Import custom hook
import { useProjectBoard } from "../hooks/use-project-board";

// Import components
import { ProjectBoardHeader } from "./project-board-header";
import { ProjectsDashboardGrid } from "./projects-dashboard-grid";
import { CreateProjectModal } from "./modals/create-project-modal";
import { CreateTaskModal } from "./modals/create-task-modal";
import { DeleteConfirmModal } from "./modals/delete-confirm-modal";
import { ManageProjectMembersModal } from "./modals/manage-project-members-modal";

const KanbanBoard = dynamic(
  () => import("./kanban-board").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl bg-white/40 border border-amber-900/5 p-5 min-h-[600px] w-full">
            <div className="h-6 w-24 bg-slate-200/60 rounded-lg mb-4" />
            <div className="space-y-3.5">
              {[0, 1].map((j) => (
                <div key={j} className="h-32 bg-white/60 rounded-2xl border border-amber-900/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

interface ProjectsListProps {
  projects: (Project & { tasks: Task[] })[];
  workspaceId: string;
  members: WorkspaceMember[];
  currentUserId?: string;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; color: string; icon: typeof Circle }
> = {
  todo: { label: "To Do", color: "text-[#9bb0a5]", icon: Circle },
  in_progress: {
    label: "In Progress",
    color: "text-[#dca15c]",
    icon: Clock,
  },
  done: {
    label: "Done",
    color: "text-rose-600",
    icon: CheckCircle2,
  },
};

function BoardContent(props: ProjectsListProps) {
  const {
    activeProject,
    optimisticProjects,
    currentProjectMembers,
    eligibleMembers,
    isWorkspaceOwner,
    isWorkspaceMember,
    isCreateProjectOpen,
    setIsCreateProjectOpen,
    isManageMembersOpen,
    setIsManageMembersOpen,
    createTaskProjectId,
    setCreateTaskProjectId,
    deleteTarget,
    setDeleteTarget,
    newTaskStatus,
    setNewTaskStatus,
    isPending,
    errorMsg,
    setErrorMsg,
    handleAddProjectMember,
    handleRemoveProjectMember,
    handleCreateProject,
    handleCreateTask,
    handleStatusChange,
    handleAssigneeChange,
    cycleTaskStatus,
    handleTasksReorder,
    handleDeleteConfirmSubmit,
  } = useProjectBoard(props);

  return (
    <div className="space-y-6 flex flex-col h-full w-full select-none relative">
      {/* Premium top linear loading bar showing sync state */}
      {isPending && typeof window !== "undefined" && createPortal(
        <div className="fixed top-14 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-yellow-500 z-40 overflow-hidden">
          <div className="h-full bg-amber-450 animate-pulse w-full" />
        </div>,
        document.body
      )}

      {/* ─── Header ─────────────────────────────────────────── */}
      <ProjectBoardHeader
        activeProject={activeProject || null}
        currentProjectMembers={currentProjectMembers}
        isWorkspaceOwner={isWorkspaceOwner}
        isWorkspaceMember={isWorkspaceMember}
        onManageMembers={() => setIsManageMembersOpen(true)}
        onDeleteProject={(target) => setDeleteTarget(target)}
        onNewProject={() => setIsCreateProjectOpen(true)}
      />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-655 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Main Content Views ─────────────────────────────────────────── */}
      <div className="transition-all duration-300">
        {activeProject ? (
          /* ─── VIEW 1: KANBAN BOARD ─── */
          <KanbanBoard
            project={activeProject}
            members={props.members}
            currentUserId={props.currentUserId}
            onAddTask={(status) => {
              setNewTaskStatus(status);
              setCreateTaskProjectId(activeProject.id);
            }}
            onDeleteTask={(id, title) =>
              setDeleteTarget({ type: "task", id, name: title })
            }
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onTasksReorder={handleTasksReorder}
          />
        ) : (
          /* ─── VIEW 2: ALL PROJECTS GRID ─── */
          <ProjectsDashboardGrid
            optimisticProjects={optimisticProjects}
            statusConfig={statusConfig}
            cycleTaskStatus={cycleTaskStatus}
            setDeleteTarget={setDeleteTarget}
            setNewTaskStatus={setNewTaskStatus}
            setCreateTaskProjectId={setCreateTaskProjectId}
            setIsCreateProjectOpen={setIsCreateProjectOpen}
            isWorkspaceMember={isWorkspaceMember}
          />
        )}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────── */}

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        isPending={isPending}
        onCreate={handleCreateProject}
      />

      <CreateTaskModal
        key={createTaskProjectId ? `${createTaskProjectId}-${newTaskStatus}` : "closed"}
        isOpen={!!createTaskProjectId}
        onClose={() => setCreateTaskProjectId(null)}
        projectName={
          optimisticProjects.find((p) => p.id === createTaskProjectId)?.name || ""
        }
        isPending={isPending}
        initialStatus={newTaskStatus}
        onCreate={handleCreateTask}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        type={deleteTarget?.type || "project"}
        name={deleteTarget?.name || ""}
        isPending={isPending}
        onConfirm={handleDeleteConfirmSubmit}
      />

      <ManageProjectMembersModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        projectId={activeProject?.id || ""}
        projectName={activeProject?.name || ""}
        currentMembers={currentProjectMembers}
        eligibleMembers={eligibleMembers}
        onAddMember={handleAddProjectMember}
        onRemoveMember={handleRemoveProjectMember}
      />
    </div>
  );
}

export function ProjectsList(props: ProjectsListProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Loading workspace board...
        </div>
      }
    >
      <BoardContent {...props} />
    </Suspense>
  );
}
