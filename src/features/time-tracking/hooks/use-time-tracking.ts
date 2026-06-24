import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getActiveTimerAction,
  startTimerAction,
  stopActiveTimerAction,
  getTaskTimeEntriesAction,
  logManualTimeAction,
  deleteTimeEntryAction,
  getTaskTimeStatsAction,
  updateTaskEstimateAction,
} from "../actions/time-tracking.action";
import type { TimeEntry, TaskTimeStats } from "../types";

let isManualStopInProgress = false;

// Events for reactivity
export const refetchActiveTimer = () => window.dispatchEvent(new CustomEvent("refetch-active-timer"));
export const refetchTaskEntries = (taskId: string) => window.dispatchEvent(new CustomEvent("refetch-task-entries", { detail: { taskId } }));
export const refetchTaskStats = (taskId: string) => window.dispatchEvent(new CustomEvent("refetch-task-stats", { detail: { taskId } }));

export function useActiveTimer() {
  const [data, setData] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchActiveTimer = useCallback(async () => {
    try {
      const active = await getActiveTimerAction();
      setData(active);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchActiveTimer();
    const interval = setInterval(() => {
      void fetchActiveTimer();
    }, 60000); // 1 min poll just in case
    return () => clearInterval(interval);
  }, [fetchActiveTimer]);

  useEffect(() => {
    window.addEventListener("refetch-active-timer", fetchActiveTimer);
    return () => window.removeEventListener("refetch-active-timer", fetchActiveTimer);
  }, [fetchActiveTimer]);

  useEffect(() => {
    const supabase = createClient();
    const channelId = `time_entries_active_timer_${Math.random().toString(36).substring(7)}`;
    
    // Subscribe to time_entries changes for realtime validation stopping
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'time_entries',
        },
        (payload) => {
          if (payload.new && payload.new.end_time !== null) {
            const currentData = dataRef.current;
            if (currentData && currentData.id === payload.new.id) {
              // Timer was stopped automatically or elsewhere
              
              const isAuto = !isManualStopInProgress;
              const title = isAuto ? "Timer Automatically Stopped" : "Timer Stopped";
              const desc = isAuto 
                ? "Your active timer was stopped because you no longer have access to the associated task or workspace."
                : "Your active timer has been successfully stopped.";
              const iconColor = isAuto ? "rose-500" : "emerald-500";
              const borderColor = isAuto ? "amber-500/30" : "emerald-500/30";

              // Show a toast about stopping
              const toast = document.createElement("div");
              toast.className = `fixed bottom-6 right-6 z-[10000] bg-slate-900 border border-${borderColor} rounded-xl p-4 shadow-2xl flex flex-col gap-1 animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-[340px]`;
              
              // Format duration 
              const duration = payload.new.duration_seconds || 0;
              const hrs = Math.floor(duration / 3600);
              const mins = Math.floor((duration % 3600) / 60);
              const secs = duration % 60;
              let durationStr = `${mins}m ${secs}s`;
              if (hrs > 0) durationStr = `${hrs}h ${mins}m`;

              toast.innerHTML = `
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full bg-${iconColor}/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div class="w-2 h-2 rounded-full bg-${iconColor}"></div>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <span class="text-[13px] font-black text-slate-200 tracking-wide leading-tight">${title}</span>
                    <span class="text-[12px] font-medium text-slate-400 leading-snug">${desc}</span>
                    <div class="mt-2 bg-slate-800/50 rounded-lg p-2 px-3 border border-slate-700/50 w-max">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tracked Time Saved:</span>
                      <span class="text-[13px] font-black text-amber-500 ml-2">${durationStr}</span>
                    </div>
                  </div>
                </div>
              `;
              document.body.appendChild(toast);
              
              setTimeout(() => {
                toast.style.opacity = "0";
                toast.style.transform = "translateY(10px)";
                toast.style.transition = "all 0.3s ease-out";
                setTimeout(() => toast.remove(), 300);
              }, 8000);

              // Invalidate query directly since we know the new state
              refetchTaskEntries(payload.new.task_id);
              refetchTaskStats(payload.new.task_id);
              
              setData(null); // Update local state immediately
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { data, isLoading };
}

const timeEntriesCache: Record<string, TimeEntry[]> = {};

export function useTaskTimeEntries(taskId: string) {
  const [data, setData] = useState<TimeEntry[]>(timeEntriesCache[taskId] || []);
  const [isLoading, setIsLoading] = useState(!timeEntriesCache[taskId]);

  const fetchEntries = useCallback(async () => {
    if (!taskId) return;
    try {
      const entries = await getTaskTimeEntriesAction(taskId);
      timeEntriesCache[taskId] = entries || [];
      setData(entries || []);
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const handleRefetch = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: string }>;
      if (customEvent.detail?.taskId === taskId) void fetchEntries();
    };
    window.addEventListener("refetch-task-entries", handleRefetch);
    return () => window.removeEventListener("refetch-task-entries", handleRefetch);
  }, [taskId, fetchEntries]);

  return { data, isLoading };
}

const taskTimeStatsCache: Record<string, TaskTimeStats | null> = {};

export function useTaskTimeStats(taskId: string) {
  const [data, setData] = useState<TaskTimeStats | null>(
    taskTimeStatsCache[taskId] !== undefined ? taskTimeStatsCache[taskId] : null
  );
  const [isLoading, setIsLoading] = useState(taskTimeStatsCache[taskId] === undefined);

  const fetchStats = useCallback(async () => {
    if (!taskId) return;
    try {
      const stats = await getTaskTimeStatsAction(taskId);
      taskTimeStatsCache[taskId] = stats;
      setData(stats);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleRefetch = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: string }>;
      if (customEvent.detail?.taskId === taskId) void fetchStats();
    };
    window.addEventListener("refetch-task-stats", handleRefetch);
    return () => window.removeEventListener("refetch-task-stats", handleRefetch);
  }, [taskId, fetchStats]);

  return { data, isLoading };
}

export function useStartTimer() {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback((taskId: string) => {
    startTransition(async () => {
      try {
        isManualStopInProgress = true;
        await startTimerAction(taskId);
        refetchActiveTimer();
        refetchTaskEntries(taskId);
        refetchTaskStats(taskId);
      } catch (e) {
        console.error(e);
        alert("Failed to start timer");
      } finally {
        setTimeout(() => {
          isManualStopInProgress = false;
        }, 5000);
      }
    });
  }, []);

  return { mutate, isPending };
}

export function useStopTimer() {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(() => {
    startTransition(async () => {
      try {
        isManualStopInProgress = true;
        const stoppedTimer = await stopActiveTimerAction();
        refetchActiveTimer();
        if (stoppedTimer) {
          refetchTaskEntries(stoppedTimer.task_id);
          refetchTaskStats(stoppedTimer.task_id);
        }
      } catch (e) {
        console.error(e);
        alert("Failed to stop timer");
      } finally {
        setTimeout(() => {
          isManualStopInProgress = false;
        }, 5000);
      }
    });
  }, []);

  return { mutate, isPending };
}

export function useLogManualTime() {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (
      variables: { taskId: string; durationSeconds: number; note?: string },
      options?: { onSuccess?: () => void }
    ) => {
      startTransition(async () => {
        try {
          await logManualTimeAction(variables.taskId, variables.durationSeconds, variables.note);
          refetchTaskEntries(variables.taskId);
          refetchTaskStats(variables.taskId);
          if (options?.onSuccess) options.onSuccess();
        } catch (e) {
          console.error(e);
          alert("Failed to log manual time");
        }
      });
    },
    []
  );

  return { mutate, isPending };
}

export function useDeleteTimeEntry() {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (variables: { entryId: string; taskId: string }, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        try {
          await deleteTimeEntryAction(variables.entryId);
          refetchTaskEntries(variables.taskId);
          refetchTaskStats(variables.taskId);
          if (options?.onSuccess) options.onSuccess();
        } catch (e) {
          console.error(e);
          alert("Failed to delete time entry");
        }
      });
    },
    []
  );

  return { mutate, isPending };
}

export function useUpdateTaskEstimate() {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (
      variables: { taskId: string; estimatedMinutes: number },
      options?: { onSuccess?: () => void }
    ) => {
      startTransition(async () => {
        try {
          await updateTaskEstimateAction(variables.taskId, variables.estimatedMinutes);
          refetchTaskStats(variables.taskId);
          if (options?.onSuccess) options.onSuccess();
        } catch (e) {
          console.error(e);
          alert("Failed to update estimate");
        }
      });
    },
    []
  );

  return { mutate, isPending };
}
