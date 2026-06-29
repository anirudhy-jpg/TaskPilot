/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessagingService } from '@/features/messages/services/messaging.service';

vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: vi.fn(),
  };
});

describe('MessagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pairKey generation', () => {
    it('should generate deterministic pair keys regardless of order', () => {
      const pair1 = (MessagingService as any).pairKey('userA', 'userB');
      const pair2 = (MessagingService as any).pairKey('userB', 'userA');
      expect(pair1).toBe(pair2);
      expect(pair1).toBe('userA:userB');
    });

    it('should properly sort numerical or mixed ids', () => {
      const pair1 = (MessagingService as any).pairKey('2', '1');
      expect(pair1).toBe('1:2');
    });
  });

  describe('Direct Messaging Logic Simulation', () => {
    it('should handle sendMessage validation', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementationOnce(() => Promise.resolve({
          data: { is_active: true, pair_key: 'sender:other' },
          error: null
        })).mockImplementationOnce(() => Promise.resolve({
          data: {
            id: 'msg-1',
            conversation_id: 'conv-1',
            sender_id: 'sender',
            content: 'Hello World',
            created_at: new Date().toISOString(),
            profiles: [{ id: 'sender', email: 'test@example.com', full_name: 'Test', avatar_url: '' }]
          },
          error: null
        })),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockSupabase);

      vi.spyOn(MessagingService as any, 'verifyConversationMembership').mockResolvedValue(true);
      vi.spyOn(MessagingService as any, 'usersShareAnyWorkspace').mockResolvedValue(true);

      const message = await MessagingService.sendMessage('conv-1', 'Hello World', 'sender');

      expect(message.content).toBe('Hello World');
      expect(message.conversationId).toBe('conv-1');
      expect(message.senderId).toBe('sender');
    });

    it('should fail sending message if no content or attachment', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_active: true, pair_key: 'sender:other' },
          error: null
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockSupabase);

      vi.spyOn(MessagingService as any, 'verifyConversationMembership').mockResolvedValue(true);
      vi.spyOn(MessagingService as any, 'usersShareAnyWorkspace').mockResolvedValue(true);

      await expect(MessagingService.sendMessage('conv-1', '   ', 'sender')).rejects.toThrow(
        'Message must contain at least text or an attachment.'
      );
    });

    it('should fail if user is not a member of the conversation', async () => {
      const mockSupabase = {}; // Not used here as membership check fails first

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockSupabase);

      vi.spyOn(MessagingService as any, 'verifyConversationMembership').mockResolvedValue(false);

      await expect(MessagingService.sendMessage('conv-1', 'Hello', 'sender')).rejects.toThrow(
        'You are not a member of this conversation.'
      );
    });

    it('should fail if users no longer share a workspace', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_active: true, pair_key: 'sender:other' },
          error: null
        }),
        update: vi.fn().mockReturnThis(),
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as any).mockResolvedValue(mockSupabase);

      vi.spyOn(MessagingService as any, 'verifyConversationMembership').mockResolvedValue(true);
      vi.spyOn(MessagingService as any, 'usersShareAnyWorkspace').mockResolvedValue(false);

      await expect(MessagingService.sendMessage('conv-1', 'Hello', 'sender')).rejects.toThrow(
        'You no longer share a workspace with this user. This conversation is read-only.'
      );
    });
  });
});
