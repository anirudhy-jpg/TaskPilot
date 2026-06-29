import React, { useRef, useEffect } from "react";

export const COMMON_EMOJIS = [
  "👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉", "🚀", "💯",
  "👎", "😅", "🙄", "🤔", "😴", "🥳", "🤩", "😡", "🥶", "💩",
  "🤫", "🤐", "🤝", "✌️", "🤞", "✨", "🌟", "💡", "🎈", "🎊"
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
  position?: "top" | "bottom";
}

export function EmojiPicker({ onSelect, isOpen, onClose, position = "top" }: EmojiPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      className={`absolute z-50 bg-[#1e2333] border border-slate-700 rounded-xl p-3 shadow-2xl w-64 ${
        position === "top" ? "bottom-[calc(100%+8px)] left-0" : "top-[calc(100%+8px)] right-0"
      }`}
    >
      <div className="grid grid-cols-6 gap-1.5">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(emoji);
              onClose();
            }}
            className="flex items-center justify-center text-xl w-8 h-8 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
