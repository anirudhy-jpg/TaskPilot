import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startTimerAction,
  stopActiveTimerAction,
  getActiveTimerAction,
  getTaskTimeEntriesAction,
  logManualTimeAction,
  deleteTimeEntryAction,
  getTaskTimeStatsAction,
  updateTaskEstimateAction
} from '../src/features/time-tracking/actions/time-tracking.action';
import { TimeTrackingService } from '../src/features/time-tracking/services/time-tracking.service';

vi.mock('../src/features/time-tracking/services/time-tracking.service', () => ({
  TimeTrackingService: {
    startTimer: vi.fn(),
    stopActiveTimer: vi.fn(),
    getActiveTimer: vi.fn(),
    getTaskTimeEntries: vi.fn(),
    logManualTime: vi.fn(),
    deleteTimeEntry: vi.fn(),
    getTaskTimeStats: vi.fn(),
    updateTaskEstimate: vi.fn()
  }
}));

describe('Time Tracking Actions', () => {
  const mockTaskId = 'task-1';
  const mockTimeEntry = { id: 'entry-1', task_id: mockTaskId, duration_seconds: 100 };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startTimerAction', () => {
    it('should call TimeTrackingService.startTimer and return entry', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(TimeTrackingService.startTimer).mockResolvedValue(mockTimeEntry as any);
      
      const result = await startTimerAction(mockTaskId);
      
      expect(result).toEqual(mockTimeEntry);
      expect(TimeTrackingService.startTimer).toHaveBeenCalledWith(mockTaskId);
    });

    it('should throw error if service fails', async () => {
      vi.mocked(TimeTrackingService.startTimer).mockRejectedValue(new Error('Service error'));
      
      await expect(startTimerAction(mockTaskId)).rejects.toThrow('Failed to start timer');
    });
  });

  describe('stopActiveTimerAction', () => {
    it('should call TimeTrackingService.stopActiveTimer and return entry', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(TimeTrackingService.stopActiveTimer).mockResolvedValue(mockTimeEntry as any);
      
      const result = await stopActiveTimerAction();
      
      expect(result).toEqual(mockTimeEntry);
      expect(TimeTrackingService.stopActiveTimer).toHaveBeenCalled();
    });

    it('should throw error if service fails', async () => {
      vi.mocked(TimeTrackingService.stopActiveTimer).mockRejectedValue(new Error('Service error'));
      
      await expect(stopActiveTimerAction()).rejects.toThrow('Failed to stop timer');
    });
  });

  describe('getActiveTimerAction', () => {
    it('should call TimeTrackingService.getActiveTimer and return entry', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(TimeTrackingService.getActiveTimer).mockResolvedValue(mockTimeEntry as any);
      
      const result = await getActiveTimerAction();
      
      expect(result).toEqual(mockTimeEntry);
      expect(TimeTrackingService.getActiveTimer).toHaveBeenCalled();
    });

    it('should return null if service fails', async () => {
      vi.mocked(TimeTrackingService.getActiveTimer).mockRejectedValue(new Error('Service error'));
      
      const result = await getActiveTimerAction();
      
      expect(result).toBeNull();
    });
  });

  describe('getTaskTimeEntriesAction', () => {
    it('should call TimeTrackingService.getTaskTimeEntries and return entries', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(TimeTrackingService.getTaskTimeEntries).mockResolvedValue([mockTimeEntry] as any);
      
      const result = await getTaskTimeEntriesAction(mockTaskId);
      
      expect(result).toEqual([mockTimeEntry]);
      expect(TimeTrackingService.getTaskTimeEntries).toHaveBeenCalledWith(mockTaskId);
    });

    it('should throw error if service fails', async () => {
      vi.mocked(TimeTrackingService.getTaskTimeEntries).mockRejectedValue(new Error('Service error'));
      
      await expect(getTaskTimeEntriesAction(mockTaskId)).rejects.toThrow('Failed to get task time entries');
    });
  });

  describe('logManualTimeAction', () => {
    it('should call TimeTrackingService.logManualTime and return entry', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(TimeTrackingService.logManualTime).mockResolvedValue(mockTimeEntry as any);
      
      const result = await logManualTimeAction(mockTaskId, 3600, 'Test manual log');
      
      expect(result).toEqual(mockTimeEntry);
      expect(TimeTrackingService.logManualTime).toHaveBeenCalledWith(mockTaskId, 3600, 'Test manual log');
    });

    it('should throw error if service fails', async () => {
      vi.mocked(TimeTrackingService.logManualTime).mockRejectedValue(new Error('Service error'));
      
      await expect(logManualTimeAction(mockTaskId, 3600)).rejects.toThrow('Failed to log manual time');
    });
  });

  describe('deleteTimeEntryAction', () => {
    it('should call TimeTrackingService.deleteTimeEntry', async () => {
      vi.mocked(TimeTrackingService.deleteTimeEntry).mockResolvedValue(undefined);
      
      await deleteTimeEntryAction('entry-1');
      
      expect(TimeTrackingService.deleteTimeEntry).toHaveBeenCalledWith('entry-1');
    });

    it('should throw error if service fails', async () => {
      vi.mocked(TimeTrackingService.deleteTimeEntry).mockRejectedValue(new Error('Service error'));
      
      await expect(deleteTimeEntryAction('entry-1')).rejects.toThrow('Failed to delete time entry');
    });
  });

  describe('getTaskTimeStatsAction', () => {
    it('should call TimeTrackingService.getTaskTimeStats and return stats', async () => {
      const mockStats = { totalTime: 3600, estimatedTime: 7200 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(TimeTrackingService.getTaskTimeStats).mockResolvedValue(mockStats as any);
      
      const result = await getTaskTimeStatsAction(mockTaskId);
      
      expect(result).toEqual(mockStats);
      expect(TimeTrackingService.getTaskTimeStats).toHaveBeenCalledWith(mockTaskId);
    });

    it('should throw error if service fails', async () => {
      vi.mocked(TimeTrackingService.getTaskTimeStats).mockRejectedValue(new Error('Service error'));
      
      await expect(getTaskTimeStatsAction(mockTaskId)).rejects.toThrow('Failed to get task time stats');
    });
  });

  describe('updateTaskEstimateAction', () => {
    it('should call TimeTrackingService.updateTaskEstimate', async () => {
      vi.mocked(TimeTrackingService.updateTaskEstimate).mockResolvedValue(undefined);
      
      await updateTaskEstimateAction(mockTaskId, 120);
      
      expect(TimeTrackingService.updateTaskEstimate).toHaveBeenCalledWith(mockTaskId, 120);
    });

    it('should throw error if service fails', async () => {
      vi.mocked(TimeTrackingService.updateTaskEstimate).mockRejectedValue(new Error('Service error'));
      
      await expect(updateTaskEstimateAction(mockTaskId, 120)).rejects.toThrow('Failed to update task estimate');
    });
  });
});
