import React from "react";
import type { TypingUser } from "../hooks/use-typing-indicator";

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return <div className="h-6 shrink-0 transition-all duration-300 opacity-0" aria-hidden="true" />;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName || "Someone"} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName || "Someone"} and ${typingUsers[1].userName || "someone"} are typing`;
    } else {
      return `${typingUsers.length} people are typing`;
    }
  };

  return (
    <div className="h-6 shrink-0 px-8 flex items-center gap-2 transition-all duration-300 opacity-100">
      <span className="text-xs font-medium text-slate-400 italic">
        {getTypingText()}
      </span>
      <div className="flex items-center gap-1">
        <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce"></span>
      </div>
    </div>
  );
}
