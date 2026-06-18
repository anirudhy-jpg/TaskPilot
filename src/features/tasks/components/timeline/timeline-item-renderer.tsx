/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import type { TimelineItem, TaskActivity, TaskComment } from "@/features/project/types/project.types";
import { ArrowRight, Activity, Edit2, Trash2 } from "lucide-react";

interface TimelineItemProps {
  item: TimelineItem;
  currentUserId?: string;
  onEditComment?: (id: string, content: string) => void;
  onDeleteComment?: (id: string) => void;
  columns?: { id: string; name: string }[];
}

interface ActivityValue {
  column_id?: string;
  priority?: string;
}

interface ActivityMetadata {
  subtask?: string;
  action?: string;
  old_status?: string;
  new_status?: string;
  [key: string]: unknown;
}

export function TimelineItemRenderer({ item, currentUserId, onEditComment, onDeleteComment, columns = [] }: TimelineItemProps) {
  if (item.type === "comment") {
    return (
      <CommentItem 
        comment={item} 
        currentUserId={currentUserId} 
        onEdit={onEditComment} 
        onDelete={onDeleteComment} 
      />
    );
  }
  return <ActivityItem activity={item} columns={columns} />;
}

function ActivityItem({ activity, columns }: { activity: TaskActivity, columns: { id: string; name: string }[] }) {
  const actorName = activity.actor?.fullName || activity.actor?.email.split("@")[0] || "Someone";
  const avatar = activity.actor?.avatarUrl;
  
  let actionText = "";
  let details = null;

  const oldVal = activity.oldValue as ActivityValue | null;
  const newVal = activity.newValue as ActivityValue | null;
  const meta = activity.metadata as ActivityMetadata | null;

  switch (activity.actionType) {
    case "TASK_CREATED":
      actionText = "created this task";
      break;
    case "STATUS_CHANGED":
      const oldCol = columns.find(c => c.id === oldVal?.column_id)?.name || "Unknown";
      const newCol = columns.find(c => c.id === newVal?.column_id)?.name || "Unknown";
      actionText = "changed status";
      details = (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400">
          <span className="line-through">{oldCol}</span>
          <ArrowRight size={10} />
          <span className="text-slate-300">{newCol}</span>
        </div>
      );
      break;
    case "PRIORITY_CHANGED":
      actionText = "changed priority";
      details = (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400">
          <span className="line-through capitalize">{oldVal?.priority}</span>
          <ArrowRight size={10} />
          <span className="text-slate-300 capitalize">{newVal?.priority}</span>
        </div>
      );
      break;
    case "ASSIGNEE_ADDED":
      actionText = "assigned the task";
      break;
    case "ASSIGNEE_REMOVED":
      actionText = "removed the assignee";
      break;
    case "TASK_UPDATED":
      if (meta?.subtask) {
        const sub = String(meta.subtask);
        if (meta.action === 'added') {
          actionText = `added subtask "${sub}"`;
        } else if (meta.action === 'status_changed') {
          actionText = `updated subtask "${sub}" status`;
          details = (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400">
              <span className="line-through uppercase">{String(meta.old_status)?.replace('_', ' ')}</span>
              <ArrowRight size={10} />
              <span className="text-slate-300 uppercase">{String(meta.new_status)?.replace('_', ' ')}</span>
            </div>
          );
        } else if (meta.action === 'assignee_changed') {
          actionText = `updated assignee for subtask "${sub}"`;
        } else {
          actionText = `updated subtask "${sub}"`;
        }
      } else {
        actionText = "updated task details";
      }
      break;
    default:
      actionText = "updated the task";
  }

  const dateStr = new Date(activity.createdAt).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });

  return (
    <div className="flex gap-3 px-2">
      <div className="relative mt-1">
        <div className="w-6 h-6 rounded-full bg-slate-850 flex items-center justify-center border border-slate-800 text-slate-400 z-10 relative overflow-hidden">
          {avatar ? (
             <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <Activity size={10} />
          )}
        </div>
      </div>
      <div className="flex flex-col min-w-0 pb-4">
        <p className="text-[11px] text-slate-400 leading-snug">
          <span className="font-extrabold text-slate-200">{actorName}</span> {actionText}
        </p>
        {details}
        <span className="text-[9px] text-slate-500 font-bold mt-1">
          {dateStr}
        </span>
      </div>
    </div>
  );
}

function CommentItem({ 
  comment, 
  currentUserId, 
  onEdit, 
  onDelete 
}: { 
  comment: TaskComment, 
  currentUserId?: string,
  onEdit?: (id: string, content: string) => void,
  onDelete?: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const isAuthor = currentUserId === comment.authorId;
  const authorName = comment.author?.fullName || comment.author?.email.split("@")[0] || "Unknown";
  const avatar = comment.author?.avatarUrl;
  const dateStr = new Date(comment.createdAt).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });

  const handleSave = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit?.(comment.id, editContent);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex gap-3 px-2 group">
      <div className="relative">
        <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 z-10 relative overflow-hidden shrink-0 mt-0.5">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-black uppercase">{authorName.charAt(0)}</span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xs relative">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-200">{authorName}</span>
            <span className="text-[9px] font-bold text-slate-500">{dateStr}</span>
            {comment.edited && <span className="text-[9px] font-bold text-slate-500 italic">(edited)</span>}
          </div>
          
          {isAuthor && !isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setIsEditing(true)} className="p-1 text-slate-500 hover:text-amber-500 rounded cursor-pointer transition-colors">
                <Edit2 size={12} />
              </button>
              <button onClick={() => onDelete?.(comment.id)} className="p-1 text-slate-500 hover:text-rose-500 rounded cursor-pointer transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full text-[11px] text-slate-200 bg-slate-955 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-amber-500 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button onClick={handleSave} className="px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded-md cursor-pointer hover:bg-amber-600 transition-colors">Save</button>
              <button onClick={() => { setIsEditing(false); setEditContent(comment.content); }} className="px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-md cursor-pointer hover:bg-slate-700 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="text-[11.5px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content.split(/(@\w+)/g).map((part, i) => {
              if (part.startsWith("@")) {
                return <span key={i} className="text-amber-500 font-extrabold bg-amber-500/10 px-1 py-0.5 rounded-md">{part}</span>;
              }
              return part;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
