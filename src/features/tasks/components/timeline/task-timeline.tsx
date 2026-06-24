import React, { useEffect, useState, useRef } from "react";
import type { TimelineItem } from "@/features/project/types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { useTaskTimelineRealtime } from "../../hooks/use-task-timeline-realtime";
import { TimelineItemRenderer } from "./timeline-item-renderer";
import { CommentComposer } from "./comment-composer";
import { addCommentAction } from "../../actions/add-comment.action";
import { updateCommentAction } from "../../actions/update-comment.action";
import { deleteCommentAction } from "../../actions/delete-comment.action";
import { getTaskTimelineAction } from "../../actions/get-task-timeline.action";
import { Loader2 } from "lucide-react";

interface TaskTimelineProps {
  taskId: string;
  currentUserId?: string;
  members: WorkspaceMember[];
  columns?: { id: string; name: string }[];
}

const timelineCache: Record<string, TimelineItem[]> = {};

export function TaskTimeline({ taskId, currentUserId, members, columns }: TaskTimelineProps) {
  const [initialTimeline, setInitialTimeline] = useState<TimelineItem[]>(timelineCache[taskId] || []);
  const [isLoading, setIsLoading] = useState(!timelineCache[taskId]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentUser = members.find(m => m.userId === currentUserId);

  // Fetch initial timeline with static import for speed
  useEffect(() => {
    let mounted = true;
    const fetchTimeline = async () => {
      try {
        const timeline = await getTaskTimelineAction(taskId, 100);
        if (timeline) timelineCache[taskId] = timeline;
        if (mounted && timeline) {
          setInitialTimeline(timeline);
        }
      } catch (err) {
        console.error("Failed to fetch timeline:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchTimeline();
    return () => { mounted = false; };
  }, [taskId]);

  const { timeline, setTimeline } = useTaskTimelineRealtime({ taskId, initialTimeline, members });

  // Auto-scroll to bottom on new items
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline.length]);

  const handleAddComment = async (content: string, mentionedUserIds: string[]) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await addCommentAction(taskId, content, mentionedUserIds);
      if (res.success && res.comment) {
        setTimeline(prev => {
          if (prev.some(t => t.id === res.comment!.id)) return prev;
          const updated = [...prev, { type: "comment", ...res.comment! } as TimelineItem];
          return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (id: string, content: string) => {
    setTimeline(prev => prev.map(t => 
      t.type === "comment" && t.id === id ? { ...t, content, edited: true } : t
    ));
    await updateCommentAction(id, content);
  };

  const handleDeleteComment = async (id: string) => {
    setTimeline(prev => prev.filter(t => t.id !== id));
    await deleteCommentAction(id);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-4 flex flex-col gap-4 relative"
      >
        {/* Timeline connector line */}
        <div className="absolute left-[35px] top-6 bottom-0 w-px bg-slate-800" />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : timeline.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <p className="text-[11px] font-bold text-slate-500">No activity yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {timeline.map(item => (
              <TimelineItemRenderer 
                key={item.id} 
                item={item} 
                currentUserId={currentUserId}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                columns={columns}
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-auto shrink-0 bg-slate-900 z-10 px-4 pb-4">
        <CommentComposer 
          members={members} 
          currentUser={currentUser}
          onSubmit={handleAddComment} 
          isSubmitting={isSubmitting} 
        />
      </div>
    </div>
  );
}
