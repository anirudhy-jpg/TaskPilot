import React, { useState, useRef, useEffect } from "react";
import { MentionSelector } from "./mention-selector";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { Loader2, Send } from "lucide-react";

interface CommentComposerProps {
  members: WorkspaceMember[];
  currentUser?: WorkspaceMember;
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<void>;
  isSubmitting?: boolean;
}

export function CommentComposer({ members, currentUser, onSubmit, isSubmitting }: CommentComposerProps) {
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    const mentionedIds = Array.from(mentionedUsers);
    await onSubmit(content.trim(), mentionedIds);
    setContent("");
    setMentionedUsers(new Set());
  };

  const filteredMembers = mentionQuery !== null ? members.filter(m => {
    const name = m.profile?.fullName?.toLowerCase() || m.profile?.email.toLowerCase() || "";
    return name.includes(mentionQuery.toLowerCase());
  }).slice(0, 5) : [];

  useEffect(() => {
    setMentionSelectedIndex(0);
  }, [mentionQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelectMention(filteredMembers[mentionSelectedIndex]);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && mentionQuery !== null) {
      setMentionQuery(null);
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const lastWord = textBeforeCursor.split(/\s/).pop();

    if (lastWord && lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1));
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (member: WorkspaceMember) => {
    if (!textareaRef.current || mentionQuery === null) return;
    
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    
    const lastWordIndex = textBeforeCursor.lastIndexOf("@" + mentionQuery);
    const newTextBefore = content.slice(0, lastWordIndex);
    const name = member.profile?.fullName || member.profile?.email.split('@')[0];
    
    const newContent = `${newTextBefore}@${name} ${textAfterCursor}`;
    setContent(newContent);
    setMentionQuery(null);
    
    setMentionedUsers(prev => {
      const next = new Set(prev);
      next.add(member.userId);
      return next;
    });
    
    textareaRef.current.focus();
  };

  const userInitials = currentUser?.profile?.fullName?.charAt(0) || currentUser?.profile?.email?.charAt(0) || "U";
  const avatarUrl = currentUser?.profile?.avatarUrl;

  return (
    <div className="relative flex items-start gap-3 mt-4 pt-4 border-t border-slate-800">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          userInitials.toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2 relative">
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-50">
            <MentionSelector
              members={filteredMembers}
              onSelect={handleSelectMention}
              selectedIndex={mentionSelectedIndex}
            />
          </div>
        )}
        <div className="relative flex flex-col gap-0 bg-slate-900/50 border border-slate-700/50 rounded-lg focus-within:border-slate-600 transition-all">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment..."
              className="w-full max-h-[150px] min-h-[44px] bg-transparent resize-none border-none outline-none text-[13px] text-slate-200 placeholder:text-slate-500 p-3 pr-10 scrollbar-thin"
              rows={1}
            />
            {content && (
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="absolute top-2 right-2 p-1.5 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50 disabled:hover:bg-amber-500 rounded-md transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                title="Send comment"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            )}
          </div>
          {!content && (
            <div className="flex items-center gap-2 px-3 pb-3 flex-wrap">
              <button onClick={() => { setContent("Can I get more info...?"); textareaRef.current?.focus(); }} className="px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-transparent border border-slate-700 hover:bg-slate-800 rounded transition-colors">
                Can I get more info...?
              </button>
              <button onClick={() => { setContent("Status update..."); textareaRef.current?.focus(); }} className="px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-transparent border border-slate-700 hover:bg-slate-800 rounded transition-colors">
                Status update...
              </button>
              <button onClick={() => { setContent("Thanks..."); textareaRef.current?.focus(); }} className="px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-transparent border border-slate-700 hover:bg-slate-800 rounded transition-colors">
                Thanks...
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
