"use client";

import React, { useState, useEffect } from "react";
import { Play, Square } from "lucide-react";
import { useActiveTimer, useStartTimer, useStopTimer } from "../hooks/use-time-tracking";
import { formatSecondsToTimer } from "../utils/time-format";
import { SwitchTimerModal } from "./SwitchTimerModal";

interface TaskTimerControlsProps {
  taskId: string;
  taskTitle?: string;
  workspaceName?: string;
}

export function TaskTimerControls({ taskId, taskTitle = "Unknown Task", workspaceName }: TaskTimerControlsProps) {
  const { data: activeTimer, isLoading } = useActiveTimer();
  const { mutate: startTimer, isPending: isStarting } = useStartTimer();
  const { mutate: stopTimer, isPending: isStopping } = useStopTimer();

  const [now, setNow] = useState(() => Date.now());
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

  const isActiveForThisTask = activeTimer?.task_id === taskId;
  const isAnotherTaskActive = activeTimer && !isActiveForThisTask;

  useEffect(() => {
    if (isActiveForThisTask && activeTimer?.start_time) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [isActiveForThisTask, activeTimer?.start_time]);

  const currentDuration = (isActiveForThisTask && activeTimer?.start_time)
    ? Math.floor((now - new Date(activeTimer.start_time).getTime()) / 1000)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-sm w-full min-w-[140px] bg-slate-800 animate-pulse border border-transparent">
          <div className="w-4 h-4 bg-slate-700 rounded-full"></div>
          <div className="w-20 h-4 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const handleToggleTimer = () => {
    if (isActiveForThisTask) {
      stopTimer();
    } else {
      if (isAnotherTaskActive) {
        setIsSwitchModalOpen(true);
      } else {
        startTimer(taskId);
      }
    }
  };

  const handleConfirmSwitch = () => {
    startTimer(taskId);
    setIsSwitchModalOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleTimer}
        disabled={isStarting || isStopping}
        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-sm w-full min-w-[140px]
          ${isActiveForThisTask 
            ? "bg-rose-500 hover:bg-rose-600 text-white" 
            : "bg-amber-500 hover:bg-amber-600 text-slate-950"}
          ${(isStarting || isStopping) ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
        `}
      >
        {isActiveForThisTask ? (
          <>
            <Square size={16} className="fill-current" />
            <span>{formatSecondsToTimer(currentDuration)}</span>
          </>
        ) : (
          <>
            <Play size={16} className="fill-current" />
            <span>Start Timer</span>
          </>
        )}
      </button>

      {activeTimer && (
        <SwitchTimerModal
          isOpen={isSwitchModalOpen}
          onClose={() => setIsSwitchModalOpen(false)}
          onConfirm={handleConfirmSwitch}
          activeTimer={activeTimer}
          newTaskTitle={taskTitle}
          newWorkspaceName={workspaceName}
          isPending={isStarting || isStopping}
        />
      )}
    </div>
  );
}
