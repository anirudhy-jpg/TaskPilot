import { useState, useEffect, useCallback } from "react";
import { getTaskAttachmentsAction } from "../actions/get-task-attachments.action";
import type { TaskAttachment } from "../types/attachment";

const attachmentsCache: Record<string, TaskAttachment[]> = {};

export function useTaskAttachments(taskId: string) {
  const [data, setData] = useState<TaskAttachment[]>(attachmentsCache[taskId] || []);
  const [isLoading, setIsLoading] = useState(!attachmentsCache[taskId]);
  const [error, setError] = useState<Error | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    setError(null);
    try {
      const { success, data: resultData, error: err } = await getTaskAttachmentsAction(taskId);
      if (!success) throw new Error(err || "Failed to fetch attachments");
      attachmentsCache[taskId] = resultData || [];
      setData(resultData || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error(e && typeof e === 'object' && 'message' in e ? String(e.message) : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAttachments();
  }, [fetchAttachments]);

  useEffect(() => {
    const handleRefetch = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: string }>;
      if (customEvent.detail?.taskId === taskId) void fetchAttachments();
    };
    window.addEventListener("refetch-attachments", handleRefetch);
    return () => window.removeEventListener("refetch-attachments", handleRefetch);
  }, [taskId, fetchAttachments]);

  return { data, isLoading, error };
}
