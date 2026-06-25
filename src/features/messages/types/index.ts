export interface Conversation {
  id: string;
  workspaceId: string;
  pairKey: string;          // deterministic "a:b" identifier
  isActive: boolean;        // false = read‑only
  createdAt: string;
  otherUser?: ConversationUser;
  lastMessage?: MessagePreview | null;
  unreadCount?: number;
}

export interface ConversationUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface MessagePreview {
  content: string;
  createdAt: string;
  senderId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentName?: string;
  attachmentPath?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  attachmentUploadedAt?: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender?: ConversationUser;
  status?: "pending" | "error";
}
