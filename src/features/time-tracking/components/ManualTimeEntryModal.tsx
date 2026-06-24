"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { useLogManualTime } from "../hooks/use-time-tracking";

interface ManualTimeEntryModalProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ManualTimeEntryModal({ taskId, isOpen, onClose }: ManualTimeEntryModalProps) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const { mutate: logManualTime, isPending } = useLogManualTime();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(hours || "0", 10);
    const m = parseInt(minutes || "0", 10);
    const durationSeconds = h * 3600 + m * 60;

    if (durationSeconds <= 0) {
      alert("Please enter a valid duration.");
      return;
    }

    logManualTime(
      { taskId, durationSeconds, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setHours("");
          setMinutes("");
          setNote("");
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide">Log Time</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Hours</label>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What were you working on?"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {isPending ? "Saving..." : "Save Time Log"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
