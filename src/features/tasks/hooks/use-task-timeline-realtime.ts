import { useState } from "react";
import { useRealtimeSubscription } from "@/lib/realtime/subscribeToTable";
import type { TimelineItem } from "@/features/project/types/project.types";

interface UseTaskTimelineRealtimeProps {
  taskId: string;
  initialTimeline: TimelineItem[];
}

export function useTaskTimelineRealtime({ taskId, initialTimeline }: UseTaskTimelineRealtimeProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);
  const [prevTaskId, setPrevTaskId] = useState(taskId);
  const [prevInitialTimeline, setPrevInitialTimeline] = useState(initialTimeline);

  if (taskId !== prevTaskId || initialTimeline !== prevInitialTimeline) {
    setPrevTaskId(taskId);
    setPrevInitialTimeline(initialTimeline);
    setTimeline(initialTimeline);
  }

  useRealtimeSubscription({
    table: "task_activities",
    filter: `task_id=eq.${taskId}`,
    onPayload: (payload) => {
      type RealtimeActivityRow = {
        id: string;
        task_id: string;
        actor_id: string | null;
        action_type: import("@/features/project/types/project.types").TaskActivityType;
        old_value: string | null;
        new_value: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      };
      const newRow = payload.new as RealtimeActivityRow;
      const eventType = payload.eventType;
      if (eventType === "INSERT") {
        setTimeline(prev => {
          if (prev.some(item => item.id === newRow.id)) return prev;
          
          const newActivity: TimelineItem = {
            type: "activity",
            id: newRow.id,
            taskId: newRow.task_id,
            actorId: newRow.actor_id,
            actionType: newRow.action_type,
            oldValue: newRow.old_value,
            newValue: newRow.new_value,
            metadata: newRow.metadata,
            createdAt: newRow.created_at,
          };
          
          const newTimeline = [...prev, newActivity];
          return newTimeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      }
    }
  });

  useRealtimeSubscription({
    table: "task_comments",
    filter: `task_id=eq.${taskId}`,
    onPayload: (payload) => {
      type RealtimeCommentRow = {
        id: string;
        task_id: string;
        author_id: string;
        content: string;
        edited: boolean;
        created_at: string;
        updated_at: string;
      };
      const newRow = payload.new as RealtimeCommentRow;
      const oldRow = payload.old as { id?: string };
      const eventType = payload.eventType;
      
      setTimeline(prev => {
        if (eventType === "INSERT") {
          if (prev.some(item => item.id === newRow.id)) return prev;
          
          const newComment: TimelineItem = {
            type: "comment",
            id: newRow.id,
            taskId: newRow.task_id,
            authorId: newRow.author_id,
            content: newRow.content,
            edited: newRow.edited,
            createdAt: newRow.created_at,
            updatedAt: newRow.updated_at,
            mentions: []
          };
          
          const newTimeline = [...prev, newComment];
          return newTimeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
        } else if (eventType === "UPDATE") {
          return prev.map(item => {
            if (item.type === "comment" && item.id === newRow.id) {
              return {
                ...item,
                content: newRow.content,
                edited: newRow.edited,
                updatedAt: newRow.updated_at
              };
            }
            return item;
          });
          
        } else if (eventType === "DELETE") {
          return prev.filter(item => item.id !== oldRow.id);
        }
        
        return prev;
      });
    }
  });

  return { timeline, setTimeline };
}
