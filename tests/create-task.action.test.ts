import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTaskAction } from '../src/features/tasks/actions/create-task.action';
import { TaskService } from '../src/features/tasks/services/task.service';
import { requireUser } from '../src/lib/supabase/server';
import { createNotification } from '../src/lib/notifications/notification.service';

// Mock dependencies
vi.mock('../src/features/tasks/services/task.service', () => ({
  TaskService: {
    createTask: vi.fn()
  }
}));
vi.mock('../src/lib/supabase/server');
vi.mock('../src/lib/notifications/notification.service');

describe('createTaskAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if input fails schema validation', async () => {
    // Missing required fields like title, projectId, etc.
    const result = await createTaskAction({} as never);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should create task successfully when input is valid', async () => {
    const mockUser = { id: 'user-1' };
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null })
          })
        })
      })
    };

    // Setup mocks
    vi.mocked(requireUser).mockResolvedValue({
      user: mockUser,
      supabase: mockSupabase
    } as never);

    const mockTask = { id: 'task-1', title: 'New Task' };
    vi.mocked(TaskService.createTask).mockResolvedValue(mockTask as never);

    const result = await createTaskAction({
      title: 'New Task',
      projectId: 'b00155b2-302a-4ce6-a704-58a1768bc430',
      columnId: '2e7a2b0c-78c0-4228-ae71-2ed2fdb904a6',
      type: 'task',
      priority: 'medium'
    });

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.task).toEqual(mockTask);
    expect(TaskService.createTask).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Task',
      projectId: 'b00155b2-302a-4ce6-a704-58a1768bc430'
    }));
  });

  it('should notify assignee if assigneeId is provided and different from user', async () => {
    const mockUser = { id: 'user-1' };
    
    // Detailed mock for the nested Supabase query chaining
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { full_name: 'John', workspace_id: 'ws-1' } });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ select: selectMock })
    };

    vi.mocked(requireUser).mockResolvedValue({
      user: mockUser,
      supabase: mockSupabase
    } as never);

    vi.mocked(TaskService.createTask).mockResolvedValue({ id: 'task-2' } as never);
    vi.mocked(createNotification).mockResolvedValue(undefined);

    await createTaskAction({
      title: 'Task For You',
      projectId: '11111111-1111-1111-1111-111111111111',
      columnId: '22222222-2222-2222-2222-222222222222',
      type: 'task',
      priority: 'medium',
      assigneeId: '44444444-4444-4444-4444-444444444444' // Different from user-1
    });

    const result = await createTaskAction({
      title: 'Task For You',
      projectId: 'b00155b2-302a-4ce6-a704-58a1768bc430',
      columnId: '2e7a2b0c-78c0-4228-ae71-2ed2fdb904a6',
      type: 'task',
      priority: 'medium',
      assigneeId: '4b13a8b4-efab-40a8-b649-e3fb63d59648' // Different from user-1
    });
    
    expect(result.error).toBeUndefined();

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: '4b13a8b4-efab-40a8-b649-e3fb63d59648',
      type: 'task_assigned',
      actorId: 'user-1'
    }));
  });
});
