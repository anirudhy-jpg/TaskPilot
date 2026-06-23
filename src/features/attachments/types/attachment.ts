export interface TaskAttachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  signed_url?: string;
}

export interface UploadAttachmentPayload {
  taskId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}
