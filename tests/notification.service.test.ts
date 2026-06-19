import { describe, it, expect, vi } from 'vitest';
import { createNotification } from '../src/lib/notifications/notification.service';

describe('Notification Service', () => {
  it('should insert a notification successfully via client', async () => {
    // Mock the Supabase client
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockClient: any = {
      from: mockFrom
    };

    await createNotification({
      userId: 'user-1',
      title: 'Test Notification',
      message: 'This is a test',
      type: 'project_member_added',
      client: mockClient
    });

    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      workspace_id: null,
      title: 'Test Notification',
      message: 'This is a test',
      type: 'project_member_added',
      read: false,
      actor_id: null,
    });
  });

  it('should not throw an error if the insert fails (swallows error)', async () => {
    // Mock the Supabase client to return an error
    const mockInsert = vi.fn().mockResolvedValue({ error: new Error('DB Error') });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockClient: any = {
      from: mockFrom
    };

    // We suppress console.error for this test so it doesn't pollute test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(createNotification({
      userId: 'user-1',
      title: 'Test',
      message: 'Test message',
      type: 'mention',
      client: mockClient
    })).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
