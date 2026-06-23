import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadAttachmentAction } from '../src/features/attachments/actions/upload-attachment.action';
import { getTaskAttachmentsAction } from '../src/features/attachments/actions/get-task-attachments.action';
import { deleteAttachmentAction } from '../src/features/attachments/actions/delete-attachment.action';
import { requireUser } from '../src/lib/supabase/server';

vi.mock('../src/lib/supabase/server');

describe('Attachment Actions', () => {
  const mockUser = { id: 'user-1' };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadAttachmentAction', () => {
    it('should upload attachment and log activity successfully', async () => {
      const mockAttachmentData = { id: 'att-1', file_name: 'test.pdf' };
      
      const singleMock = vi.fn().mockResolvedValue({ data: mockAttachmentData, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      
      // We also need to mock insert for task_activities
      const activitiesInsertMock = vi.fn().mockResolvedValue({ error: null });
      
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'task_attachments') return { insert: insertMock };
          if (table === 'task_activities') return { insert: activitiesInsertMock };
          return {};
        })
      };

      vi.mocked(requireUser).mockResolvedValue({
        user: mockUser,
        supabase: mockSupabase
      } as never);

      const payload = {
        taskId: 'task-1',
        fileName: 'test.pdf',
        filePath: 'path/to/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      };

      const result = await uploadAttachmentAction(payload);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAttachmentData);
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        task_id: payload.taskId,
        uploaded_by: mockUser.id,
        file_name: payload.fileName
      }));
      expect(activitiesInsertMock).toHaveBeenCalledWith(expect.objectContaining({
        task_id: payload.taskId,
        actor_id: mockUser.id,
        action_type: 'ATTACHMENT_ADDED'
      }));
    });

    it('should handle errors during upload', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      
      const mockSupabase = {
        from: vi.fn().mockReturnValue({ insert: insertMock })
      };

      vi.mocked(requireUser).mockResolvedValue({
        user: mockUser,
        supabase: mockSupabase
      } as never);

      const result = await uploadAttachmentAction({
        taskId: 'task-1',
        fileName: 'test.pdf',
        filePath: 'path/to/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB Error');
    });
  });

  describe('getTaskAttachmentsAction', () => {
    it('should retrieve attachments and generate signed URLs', async () => {
      const mockAttachments = [
        { id: 'att-1', file_path: 'path/1.pdf' },
        { id: 'att-2', file_path: 'path/2.pdf' }
      ];

      const orderMock = vi.fn().mockResolvedValue({ data: mockAttachments, error: null });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      const createSignedUrlMock = vi.fn((path) => {
        return Promise.resolve({ data: { signedUrl: `https://signed.url/${path}` }, error: null });
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: selectMock }),
        storage: {
          from: vi.fn().mockReturnValue({ createSignedUrl: createSignedUrlMock })
        }
      };

      vi.mocked(requireUser).mockResolvedValue({
        user: mockUser,
        supabase: mockSupabase
      } as never);

      const result = await getTaskAttachmentsAction('task-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].signed_url).toBe('https://signed.url/path/1.pdf');
      expect(result.data?.[1].signed_url).toBe('https://signed.url/path/2.pdf');
      expect(createSignedUrlMock).toHaveBeenCalledTimes(2);
    });

    it('should return error if fetching attachments fails', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch Error') });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: selectMock })
      };

      vi.mocked(requireUser).mockResolvedValue({
        user: mockUser,
        supabase: mockSupabase
      } as never);

      const result = await getTaskAttachmentsAction('task-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch Error');
    });
  });

  describe('deleteAttachmentAction', () => {
    it('should delete attachment from storage, db, and log activity', async () => {
      const removeMock = vi.fn().mockResolvedValue({ error: null });
      
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

      const activitiesInsertMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({ remove: removeMock })
        },
        from: vi.fn((table: string) => {
          if (table === 'task_attachments') return { delete: deleteMock };
          if (table === 'task_activities') return { insert: activitiesInsertMock };
          return {};
        })
      };

      vi.mocked(requireUser).mockResolvedValue({
        user: mockUser,
        supabase: mockSupabase
      } as never);

      const result = await deleteAttachmentAction('att-1', 'path/to/test.pdf', 'task-1', 'test.pdf');

      expect(result.success).toBe(true);
      expect(removeMock).toHaveBeenCalledWith(['path/to/test.pdf']);
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'att-1');
      expect(activitiesInsertMock).toHaveBeenCalledWith(expect.objectContaining({
        task_id: 'task-1',
        actor_id: mockUser.id,
        action_type: 'ATTACHMENT_REMOVED'
      }));
    });

    it('should handle database error on delete', async () => {
      const removeMock = vi.fn().mockResolvedValue({ error: null });
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('DB Delete Error') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({ remove: removeMock })
        },
        from: vi.fn().mockReturnValue({ delete: deleteMock })
      };

      vi.mocked(requireUser).mockResolvedValue({
        user: mockUser,
        supabase: mockSupabase
      } as never);

      const result = await deleteAttachmentAction('att-1', 'path/to/test.pdf', 'task-1', 'test.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB Delete Error');
    });
  });
});
