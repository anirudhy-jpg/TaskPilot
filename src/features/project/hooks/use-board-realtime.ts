import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, Column } from "../types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { mapRealtimeTask } from "./use-tasks-realtime";

interface UseBoardRealtimeProps {
  projectId: string | null;
  members: WorkspaceMember[];
  onColumnInsert: (column: Column) => void;
  onColumnUpdate: (column: Column) => void;
  onColumnDelete: (columnId: string) => void;
  onTaskInsert: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onProjectMemberInsert?: (userId: string) => void;
  onProjectMemberDelete?: (userId: string) => void;
}

export function useBoardRealtime({
  projectId,
  members,
  onColumnInsert,
  onColumnUpdate,
  onColumnDelete,
  onTaskInsert,
  onTaskUpdate,
  onTaskDelete,
  onProjectMemberInsert,
  onProjectMemberDelete,
}: UseBoardRealtimeProps) {
  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();
    // Isolation suffix prevents duplicate subscriptions / channel overlap issues
    const channelName = `db-board:${projectId}:${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "columns" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === "INSERT" && newRow) {
            if (newRow.board_id !== projectId) return;
            onColumnInsert({
              id: newRow.id,
              boardId: newRow.board_id,
              name: newRow.name,
              position: newRow.position,
              createdAt: newRow.created_at,
            });
          } else if (eventType === "UPDATE" && newRow) {
            if (newRow.board_id !== projectId) {
              onColumnDelete(newRow.id);
              return;
            }
            onColumnUpdate({
              id: newRow.id,
              boardId: newRow.board_id,
              name: newRow.name,
              position: newRow.position,
              createdAt: newRow.created_at,
            });
          } else if (eventType === "DELETE" && oldRow) {
            onColumnDelete((oldRow as any).id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === "INSERT" && newRow) {
            if (newRow.project_id !== projectId) return;
            const newTask = mapRealtimeTask(newRow, members);
            onTaskInsert(newTask);
          } else if (eventType === "UPDATE" && newRow) {
            if (newRow.project_id !== projectId) {
              onTaskDelete(newRow.id);
              return;
            }
            const updatedTask = mapRealtimeTask(newRow, members);
            onTaskUpdate(updatedTask);
          } else if (eventType === "DELETE" && oldRow) {
            onTaskDelete((oldRow as any).id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === "INSERT" && newRow) {
            if (newRow.project_id !== projectId) return;
            onProjectMemberInsert?.(newRow.user_id);
          } else if (eventType === "DELETE" && oldRow) {
            if (oldRow.project_id !== projectId) return;
            onProjectMemberDelete?.(oldRow.user_id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    projectId,
    members,
    onColumnInsert,
    onColumnUpdate,
    onColumnDelete,
    onTaskInsert,
    onTaskUpdate,
    onTaskDelete,
    onProjectMemberInsert,
    onProjectMemberDelete,
  ]);
}
