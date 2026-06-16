import { useTransition } from "react";
import { useParams } from "next/navigation";
import { useProjectBoardState } from "./use-project-board-state";
import { useProjectBoardModals } from "./use-project-board-modals";
import { useProjectBoardOperations } from "./use-project-board-operations";
import type { Project, Task, Column } from "../types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";

export interface UseProjectBoardProps {
  projects: (Project & { tasks: Task[]; columns: Column[] })[];
  workspaceId: string;
  members: WorkspaceMember[];
  currentUserId?: string;
}

export function useProjectBoard({
  projects,
  workspaceId,
  members,
  currentUserId,
}: UseProjectBoardProps) {
  const params = useParams();
  const activeProjectId = (params?.projectId as string) || null;

  // 1. Get State (current, optimistic, real-time board logic)
  const {
    currentProjects,
    setCurrentProjects,
    optimisticProjects,
    setOptimisticProjects,
  } = useProjectBoardState({
    projects,
    members,
    activeProjectId,
  });

  // 2. Get Modal States
  const {
    isCreateProjectOpen,
    setIsCreateProjectOpen,
    projectToEdit,
    setProjectToEdit,
    isManageMembersOpen,
    setIsManageMembersOpen,
    createTaskProjectId,
    setCreateTaskProjectId,
    deleteTarget,
    setDeleteTarget,
    newTaskStatus,
    setNewTaskStatus,
    errorMsg,
    setErrorMsg,
  } = useProjectBoardModals();

  // 3. Derived States
  const activeProject = optimisticProjects.find(
    (p) => p.id === activeProjectId,
  );

  const workspaceOwner = members.find((m) => m.role === "owner");
  const isWorkspaceOwner = workspaceOwner?.userId === currentUserId;

  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const currentUserRole =
    currentUserMember?.role || (isWorkspaceOwner ? "owner" : "member");
  const isWorkspaceMember = currentUserRole === "member";

  const projectMemberUserIds = activeProject?.memberUserIds || [];
  const currentProjectMembers = members.filter(
    (m) =>
      projectMemberUserIds.includes(m.userId) ||
      m.userId === activeProject?.createdBy,
  );
  const eligibleMembers = members.filter(
    (m) =>
      !projectMemberUserIds.includes(m.userId) &&
      m.userId !== activeProject?.createdBy,
  );

  const [isPending, startTransition] = useTransition();

  // 4. Operations (CRUD callbacks)
  const {
    handleAddProjectMember,
    handleRemoveProjectMember,
    handleCreateProject,
    handleCreateTask,
    handleAssigneeChange,
    handleMoveTask,
    handleUpdateTask,
    handleCreateColumn,
    handleRenameColumn,
    handleMoveColumn,
    handleDeleteColumn,
    handleUpdateProject,
    cycleTaskStatus,
    handleDeleteConfirmSubmit,
  } = useProjectBoardOperations({
    workspaceId,
    currentUserId,
    activeProjectId,
    activeProject,
    members,
    currentProjects,
    setCurrentProjects,
    optimisticProjects,
    setOptimisticProjects,
    setIsCreateProjectOpen,
    setProjectToEdit,
    setCreateTaskProjectId,
    createTaskProjectId,
    deleteTarget,
    setDeleteTarget,
    setErrorMsg,
    startTransition,
  });

  return {
    activeProjectId,
    activeProject,
    optimisticProjects,
    currentProjectMembers,
    eligibleMembers,
    isWorkspaceOwner,
    isWorkspaceMember,
    isCreateProjectOpen,
    setIsCreateProjectOpen,
    projectToEdit,
    setProjectToEdit,
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
    handleAssigneeChange,
    handleMoveTask,
    handleUpdateTask,
    cycleTaskStatus,
    handleCreateColumn,
    handleRenameColumn,
    handleMoveColumn,
    handleDeleteColumn,
    handleUpdateProject,
    handleDeleteConfirmSubmit,
  };
}
