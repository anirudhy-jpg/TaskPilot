import { useState } from "react";
import type { Project } from "../types/project.types";

export function useProjectBoardModals() {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "project" | "task";
    id: string;
    name: string;
  } | null>(null);

  const [newTaskStatus, setNewTaskStatus] = useState<string>("todo");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return {
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
  };
}
