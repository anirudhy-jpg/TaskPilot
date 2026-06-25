"use client";

import React, { useEffect, useState, useRef, useTransition } from "react";
import { Lock, Loader2 } from "lucide-react";
import type { Conversation, Message } from "../types";
import { useConversationStatus } from "../hooks/use-conversation-status";
import { useChatRealtime } from "../hooks/use-chat-realtime";
import {
  getMessagesAction,
  sendMessageAction,
  editMessageAction,
  deleteMessageAction,
} from "../actions/messages.action";
import {
  markConversationReadAction,
  getSharedProjectsInfoAction,
} from "../actions/conversations.action";
import { TypingIndicator } from "./typing-indicator";
import type { TypingUser } from "../hooks/use-typing-indicator";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Avatar } from "@/components/ui/avatar";
import { useUploadMessageAttachment } from "../hooks/use-upload-message-attachment";
import { CHAT_LIMITS } from "../constants";

export const ChatBox = React.memo(function ChatBox({
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  conversation,
  typingUsers,
  startTyping,
  stopTyping,
}: {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  conversation: Conversation;
  typingUsers: TypingUser[];
  startTyping: () => void;
  stopTyping: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedProjects, setSharedProjects] = useState<{
    count: number;
    names: string[];
  }>({ count: 0, names: [] });
  const scrollRef = useRef<HTMLDivElement>(null);

  const isActive = useConversationStatus(
    conversation.id,
    conversation.isActive,
  );
  const [, startTransition] = useTransition();
  const { uploadMessageAttachment, deleteMessageAttachment, isUploading } = useUploadMessageAttachment();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isSendLocked, setIsSendLocked] = useState(false);

  // Lock sending if pending messages reach the limit, unlock when all are sent
  useEffect(() => {
    const pendingCount = messages.filter((m) => m.status === "pending").length;
    if (pendingCount >= CHAT_LIMITS.MESSAGES_PER_5_SEC) {
      setIsSendLocked(true);
    } else if (pendingCount === 0 && isSendLocked) {
      setIsSendLocked(false);
    }
  }, [messages, isSendLocked]);

  // Fetch messages and shared projects on load
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.all([
      getMessagesAction(conversation.id, undefined, 50),
      getSharedProjectsInfoAction(workspaceId, conversation.otherUser!.id),
    ]).then(([msgRes, projRes]) => {
      if (mounted) {
        if (msgRes.success && msgRes.data) {
          setMessages(msgRes.data.messages.reverse());
        }
        if (projRes.success && projRes.data) {
          setSharedProjects(projRes.data);
        }
        setIsLoading(false);
      }
    });

    // Mark read
    markConversationReadAction(conversation.id).then(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("conversation-read"));
      }
    });

    // Expose active conversation for global listeners (like toasts)
    if (typeof window !== "undefined") {
      (window as any).activeConversationId = conversation.id;
    }

    return () => {
      mounted = false;
      if (
        typeof window !== "undefined" &&
        (window as any).activeConversationId === conversation.id
      ) {
        (window as any).activeConversationId = null;
      }
    };
  }, [conversation.id, workspaceId, conversation.otherUser?.id]);

  // Realtime subscription
  useChatRealtime({
    conversationId: conversation.id,
    onMessageInsert: (msg) => {
      const sender =
        msg.senderId === currentUserId
          ? {
              id: currentUserId,
              fullName: currentUserName,
              email: "",
              avatarUrl: currentUserAvatarUrl,
            }
          : conversation.otherUser;

      const completeMsg = { ...msg, sender: msg.sender || (sender as any) };

      setMessages((prev) => {
        if (prev.find((p) => p.id === completeMsg.id)) return prev;

        // Anti-flicker: If it's my own message, check if there's an optimistic message with the same content
        if (msg.senderId === currentUserId) {
          const tempMsgIndex = prev.findIndex(
            (p) => p.id.startsWith("temp-") && p.content === msg.content,
          );
          if (tempMsgIndex !== -1) {
            const newMessages = [...prev];
            newMessages[tempMsgIndex] = completeMsg;
            return newMessages;
          }
        }

        return [...prev, completeMsg];
      });
      markConversationReadAction(conversation.id).then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("conversation-read"));
        }
      });
    },
    onMessageUpdate: (msg) => {
      setMessages((prev) =>
        prev.map((p) => (p.id === msg.id ? { ...p, ...msg } : p)),
      );
    },
    onMessageDelete: (msgId) => {
      setMessages((prev) =>
        prev.map((p) =>
          p.id === msgId ? { ...p, deletedAt: new Date().toISOString() } : p,
        ),
      );
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (content: string, file?: File) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId: conversation.id,
      senderId: currentUserId,
      content,
      attachmentName: file?.name,
      attachmentSize: file?.size,
      attachmentMimeType: file?.type,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      sender: {
        id: currentUserId,
        fullName: currentUserName,
        email: "",
        avatarUrl: currentUserAvatarUrl,
      },
      status: "pending",
    };

    // Optimistic UI update: instantly show message
    setMessages((prev) => [...prev, optimisticMessage]);

    let attachmentMetadata = undefined;
    try {
      if (file) {
        attachmentMetadata = await uploadMessageAttachment(workspaceId, conversation.id, file);
      }
    } catch (error) {
      console.error("Upload failed", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: "error" } : m,
        ),
      );
      return;
    }

    const res = await sendMessageAction(
      conversation.id, 
      content, 
      attachmentMetadata ? {
        name: attachmentMetadata.fileName,
        path: attachmentMetadata.path,
        size: attachmentMetadata.fileSize,
        mimeType: attachmentMetadata.mimeType,
      } : undefined
    );

    if (!res.success && attachmentMetadata) {
      // Cleanup uploaded file on failure
      await deleteMessageAttachment(attachmentMetadata.path);
    }

    setMessages((prev) => {
      if (res.success && res.data) {
        // Find if Realtime already inserted the real message
        const realMsgExists = prev.find((m) => m.id === res.data!.id);
        if (realMsgExists) {
          return prev.filter((m) => m.id !== tempId); // Just remove temp
        } else {
          // Upgrade temp message to real message
          return prev.map((m) => (m.id === tempId ? res.data! : m));
        }
      } else {
        console.error(res.error);
        // Mark as error
        return prev.map((m) =>
          m.id === tempId ? { ...m, status: "error" } : m,
        );
      }
    });
  };

  const handleRetry = async (tempId: string) => {
    const messageToRetry = messages.find((m) => m.id === tempId);
    if (!messageToRetry) return;

    // Set back to pending
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, status: "pending" } : m)),
    );

    const res = await sendMessageAction(
      conversation.id,
      messageToRetry.content,
    );

    setMessages((prev) => {
      if (res.success && res.data) {
        const realMsgExists = prev.find((m) => m.id === res.data!.id);
        if (realMsgExists) {
          return prev.filter((m) => m.id !== tempId);
        } else {
          return prev.map((m) => (m.id === tempId ? res.data! : m));
        }
      } else {
        console.error(res.error);
        return prev.map((m) =>
          m.id === tempId ? { ...m, status: "error" } : m,
        );
      }
    });
  };

  const handleEdit = (id: string, content: string) => {
    startTransition(async () => {
      await editMessageAction(id, content);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteMessageAction(id);
    });
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-[#090d16]">
      {/* Header */}
      <div className="h-[88px] shrink-0 border-b border-slate-800/80 bg-[#0b0f19] flex items-center px-4 md:px-6 z-20 shadow-sm justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              user={conversation.otherUser as any}
              className="w-11 h-11 border border-slate-700/50 shadow-sm"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-slate-100 leading-tight">
                {conversation.otherUser?.fullName ||
                  conversation.otherUser?.email}
              </h3>
              {isActive ? (
                <span className="text-xs font-medium text-emerald-500 flex items-center gap-1.5 leading-tight">
                  Active
                </span>
              ) : (
                <span className="text-xs font-medium text-rose-500 flex items-center gap-1.5 leading-tight">
                  <Lock size={10} /> Read Only
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate max-w-[400px]">
              {sharedProjects.count > 0 ? (
                <>
                  <span>
                    {sharedProjects.count} Shared Project
                    {sharedProjects.count !== 1 ? "s" : ""}
                  </span>
                  {sharedProjects.names.slice(0, 3).map((name, idx) => (
                    <React.Fragment key={idx}>
                      <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0"></span>
                      <span className="truncate">{name}</span>
                    </React.Fragment>
                  ))}
                  {sharedProjects.count > 3 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0"></span>
                      <span>+{sharedProjects.count - 3} more</span>
                    </>
                  )}
                </>
              ) : (
                <span>No shared projects</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Read Only Banner */}
      {!isActive && (
        <div className="shrink-0 bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 flex items-center justify-center gap-2 text-rose-400 text-xs font-bold z-10 shadow-sm">
          <Lock size={12} />
          You and this user no longer share any project. This conversation is
          read-only.
        </div>
      )}

      {/* Message List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 scrollbar-thin scroll-smooth"
      >
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <Loader2 className="animate-spin w-8 h-8 text-amber-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/30 flex items-center justify-center mb-4 border border-slate-700/50 shadow-inner">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-messages-square text-amber-500/50"
              >
                <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5Z" />
                <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
              </svg>
            </div>
            <p className="text-sm font-medium">
              Send a message to start the conversation!
            </p>
          </div>
        ) : (
          <div className="flex flex-col w-full pt-4 pb-2">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUserId}
                isReadOnly={!isActive}
                isEditing={editingMessageId === msg.id}
                onSetEditing={(isEditing) => setEditingMessageId(isEditing ? msg.id : null)}
                onEdit={(id, content) => {
                  handleEdit(id, content);
                  setEditingMessageId(null);
                }}
                onDelete={handleDelete}
                onRetry={handleRetry}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 flex flex-col">
        <TypingIndicator typingUsers={typingUsers} />
        <MessageInput
          onSend={handleSend}
          disabled={!isActive || isSendLocked}
          disabledReason={isSendLocked ? "Please wait until all messages are sent..." : undefined}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          isUploading={isUploading}
        />
      </div>
    </div>
  );
});
