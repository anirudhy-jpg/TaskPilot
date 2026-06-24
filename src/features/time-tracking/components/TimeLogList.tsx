"use client";

import React, { useState } from "react";
import { Trash2, Clock, FileText, Check, X } from "lucide-react";
import { useTaskTimeEntries, useDeleteTimeEntry, useUpdateTimeEntryNote } from "../hooks/use-time-tracking";
import { formatSecondsToShortString } from "../utils/time-format";
import { DeleteConfirmModal } from "@/features/project/components/modals/delete-confirm-modal";
import Image from "next/image";

interface TimeLogListProps {
  taskId: string;
}

export function TimeLogList({ taskId }: TimeLogListProps) {
  const { data: entries, isLoading } = useTaskTimeEntries(taskId);
  const { mutate: deleteEntry, isPending: isDeleting } = useDeleteTimeEntry();
  const { mutate: updateNote, isPending: isUpdatingNote } = useUpdateTimeEntryNote();
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");

  const handleSaveNote = (entryId: string) => {
    updateNote({ entryId, taskId, note: editNoteText }, {
      onSuccess: () => setEditingLogId(null)
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 mt-4 animate-pulse">
        <div className="h-6 w-1/4 bg-slate-800 rounded"></div>
        <div className="h-10 bg-slate-800/50 rounded-lg"></div>
        <div className="h-10 bg-slate-800/50 rounded-lg"></div>
      </div>
    );
  }

  const totalSeconds = entries?.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0) || 0;

  return (
    <div className="flex flex-col gap-3 mt-6">
      <div className="flex items-center gap-4 border-b border-slate-800/50 pb-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <h3 className="text-base font-bold text-slate-200 tracking-wide">Time Logs</h3>
        </div>
        <span className="text-[11px] font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
          {formatSecondsToShortString(totalSeconds)} total
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mt-2">
        {/* Table Header */}
        <div className="flex items-center px-3 py-2 text-[11px] font-bold text-slate-400">
          <div className="w-[120px]">Date</div>
          <div className="w-[120px]">Time</div>
          <div className="w-[100px]">Duration</div>
          <div className="w-[140px]">User</div>
          <div className="flex-1">Note</div>
          <div className="w-[40px]"></div>
        </div>
        {!entries || entries.length === 0 ? (
          <div className="text-center py-4 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            <span className="text-xs text-slate-500 font-medium">No time logged yet.</span>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center justify-between px-3 py-2.5 bg-slate-900/50 hover:bg-slate-800/50 rounded-xl border border-slate-800 transition-colors"
            >
              <div className="w-[120px] text-[12px] text-slate-400">
                {new Date(entry.start_time).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric"
                })}
              </div>

              <div className="w-[120px] text-[12px] font-medium text-slate-200">
                {new Date(entry.start_time).toLocaleString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: false
                })} - {entry.end_time ? new Date(entry.end_time).toLocaleString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: false
                }) : "Now"}
              </div>

              <div className="w-[100px]">
                <span className="text-[11px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {formatSecondsToShortString(entry.duration_seconds || 0)}
                </span>
              </div>

              <div className="w-[140px] flex items-center gap-2">
                {entry.user?.avatar_url ? (
                  <Image
                    src={entry.user.avatar_url}
                    alt={entry.user.full_name || "User"}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <span className="text-[9px] font-bold text-slate-400">
                      {entry.user?.email?.[0].toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <span className="text-[12px] font-medium text-slate-300 truncate">
                  {entry.user?.full_name || entry.user?.email?.split("@")[0] || "Unknown"}
                </span>
              </div>

              <div className="flex-1 text-[12px] text-slate-400 italic truncate pr-2">
                {editingLogId === entry.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none focus:border-indigo-500"
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveNote(entry.id);
                        if (e.key === "Escape") setEditingLogId(null);
                      }}
                      autoFocus
                      disabled={isUpdatingNote}
                    />
                    <button
                      onClick={() => handleSaveNote(entry.id)}
                      className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded disabled:opacity-50"
                      disabled={isUpdatingNote}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingLogId(null)}
                      className="p-1 text-slate-400 hover:bg-slate-700 rounded disabled:opacity-50"
                      disabled={isUpdatingNote}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span>{entry.note || "—"}</span>
                )}
              </div>

              <div className="w-[60px] flex justify-end gap-1">
                <button
                  onClick={() => {
                    setEditingLogId(entry.id);
                    setEditNoteText(entry.note || "");
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all cursor-pointer disabled:opacity-0"
                  title="Edit note"
                  disabled={!!editingLogId}
                >
                  <FileText size={14} />
                </button>
                <button
                  onClick={() => setDeletingLogId(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer disabled:opacity-0"
                  title="Delete log"
                  disabled={!!editingLogId}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!deletingLogId}
        onClose={() => !isDeleting && setDeletingLogId(null)}
        type="time_log"
        name="time log"
        isPending={isDeleting}
        onConfirm={() => {
          if (deletingLogId) {
            deleteEntry({ entryId: deletingLogId, taskId }, {
              onSuccess: () => setDeletingLogId(null)
            });
          }
        }}
      />
    </div>
  );
}
