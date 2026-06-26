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

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user?: ConversationUser;
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
  replyToMessageId?: string | null;
  replyToMessage?: {
    id: string;
    content: string;
    deletedAt: string | null;
    sender: ConversationUser;
  } | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender?: ConversationUser;
  status?: "pending" | "error";
  reactions?: MessageReaction[];
}
