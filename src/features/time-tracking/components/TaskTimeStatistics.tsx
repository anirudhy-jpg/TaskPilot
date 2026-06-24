"use client";

import React, { useState } from "react";
import { Edit2, X, Plus } from "lucide-react";
import { useTaskTimeStats, useUpdateTaskEstimate, useTaskTimeEntries } from "../hooks/use-time-tracking";
import { formatSecondsToShortString } from "../utils/time-format";
import { TaskTimerControls } from "./TaskTimerControls";
import { ManualTimeEntryModal } from "./ManualTimeEntryModal";

interface TaskTimeStatisticsProps {
  taskId: string;
  taskTitle?: string;
  workspaceName?: string;
}

export function TaskTimeStatistics({ taskId, taskTitle, workspaceName }: TaskTimeStatisticsProps) {
  const { data: stats, isLoading } = useTaskTimeStats(taskId);
  const { data: entries } = useTaskTimeEntries(taskId);
  const { mutate: updateEstimate, isPending } = useUpdateTaskEstimate();

  const [isEditing, setIsEditing] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  const estimatedTotalSeconds = stats?.estimatedMinutes ? stats.estimatedMinutes * 60 : 0;
  const trackedSeconds = stats?.trackedSeconds || 0;
  
  const progressPercentage = estimatedTotalSeconds > 0 
    ? Math.min((trackedSeconds / estimatedTotalSeconds) * 100, 100) 
    : 0;

  const remainingSeconds = Math.max(0, estimatedTotalSeconds - trackedSeconds);
  const entryCount = entries?.length || 0;

  const isOverEstimate = estimatedTotalSeconds > 0 && trackedSeconds > estimatedTotalSeconds;

  const handleEditClick = () => {
    if (!stats) return;
    const h = Math.floor(stats.estimatedMinutes / 60);
    const m = stats.estimatedMinutes % 60;
    setEstimatedHours(h.toString());
    setEstimatedMinutes(m.toString());
    setIsEditing(true);
  };

  const handleSave = () => {
    const h = parseInt(estimatedHours || "0", 10);
    const m = parseInt(estimatedMinutes || "0", 10);
    const totalMins = h * 60 + m;
    updateEstimate({ taskId, estimatedMinutes: totalMins }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  return (
    <div className="flex items-center justify-between p-6 bg-transparent border border-slate-800/80 rounded-2xl mt-4">
      
      {/* Left Section: Stats */}
      <div className="flex items-center gap-8 lg:gap-12 flex-1">
        
        {isLoading || !stats ? (
          <div className="flex items-center gap-8 lg:gap-12 w-full animate-pulse">
             <div className="flex flex-col gap-2 w-24">
                <div className="h-3 w-16 bg-slate-800 rounded"></div>
                <div className="h-6 w-20 bg-slate-800 rounded mt-1"></div>
             </div>
             <div className="w-[1px] h-12 bg-slate-800/60 hidden md:block" />
             <div className="flex flex-col gap-2 w-24 hidden sm:flex">
                <div className="h-3 w-16 bg-slate-800 rounded"></div>
                <div className="h-6 w-20 bg-slate-800 rounded mt-1"></div>
             </div>
             <div className="w-[1px] h-12 bg-slate-800/60 hidden md:block" />
             <div className="flex gap-4 hidden md:flex items-center">
                <div className="flex flex-col gap-2 w-20 items-end">
                   <div className="h-3 w-16 bg-slate-800 rounded"></div>
                   <div className="h-3 w-12 bg-slate-800 rounded mt-auto"></div>
                </div>
                <div className="w-14 h-14 rounded-full bg-slate-800 shrink-0"></div>
             </div>
          </div>
        ) : (
          <>
            {/* Estimated Time */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            ESTIMATED TIME
            <button 
              onClick={handleEditClick}
              className="text-slate-500 hover:text-amber-500 transition-colors cursor-pointer"
            >
              <Edit2 size={10} />
            </button>
          </span>
          <span className="text-[26px] font-bold text-slate-100 tracking-tight leading-none mt-1">
            {stats.estimatedMinutes > 0 ? formatSecondsToShortString(estimatedTotalSeconds).replace(' ', ' ') : "0h 0m"} 
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] h-12 bg-slate-800/60 hidden md:block" />

        {/* Time Tracked */}
        <div className="flex flex-col gap-1 hidden sm:flex">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            TIME TRACKED
          </span>
          <div className="flex flex-col">
            <span className="text-[26px] font-bold text-slate-100 tracking-tight leading-none mt-1">
              {formatSecondsToShortString(trackedSeconds)}
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-1">
              from {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] h-12 bg-slate-800/60 hidden md:block" />

        {/* Progress */}
        <div className="flex items-center gap-4 hidden md:flex">
          <div className="flex flex-col items-end gap-1 h-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              PROGRESS
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-auto pt-4">
              {stats.estimatedMinutes > 0 
                ? (remainingSeconds > 0 ? `${formatSecondsToShortString(remainingSeconds)} remaining` : '0m remaining')
                : 'No estimate'
              }
            </span>
          </div>
          
          {/* Pie Chart Doughnut */}
          <div className="w-14 h-14 rounded-full relative shrink-0 overflow-hidden bg-slate-800/50 flex items-center justify-center">
            <div 
              className="absolute inset-0 transition-all duration-1000 ease-out"
              style={{
                background: `conic-gradient(${isOverEstimate ? '#f43f5e' : '#f59e0b'} ${progressPercentage}%, transparent ${progressPercentage}%)`
              }}
            />
            {/* Inner mask */}
            <div className="absolute inset-[4px] bg-slate-900 rounded-full flex items-center justify-center shadow-inner">
              <span className="text-[11px] font-bold text-slate-200">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </div>
          </>
        )}

      </div>

      {/* Right Section: Buttons */}
      <div className="flex flex-col gap-3 pl-8 shrink-0 min-w-[160px] lg:min-w-[180px]">
        <TaskTimerControls taskId={taskId} taskTitle={taskTitle} workspaceName={workspaceName} />
        <button 
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-300 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-all shadow-sm cursor-pointer"
        >
          <Plus size={14} /> Add Manual Time
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide">Set Estimate</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {isPending ? "Saving..." : "Save Estimate"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ManualTimeEntryModal
        taskId={taskId}
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
}
