  # Direct Messaging (1-to-1 Chat) Implementation Plan

This plan details the implementation of a 1-to-1 real-time messaging feature between project members within the same project.

## User Review Required

> [!IMPORTANT]
> The database tables will be created **without** Row Level Security (RLS) policies as per your explicit instructions. Security will be enforced strictly via application-level checks in the server actions. Please confirm this security model.

> [!IMPORTANT]
> The realtime subscriptions will require enabling the Supabase Realtime publication on the `messages` table. This migration will be included.

## Open Questions

1. Do we want to include features like "read receipts" or is a simple unread count (based on last seen timestamp, or just unread logic) sufficient for now? The current schema does not have a "last read" timestamp for conversation members. I will implement a basic version or add a `last_read_at` to `conversation_members` if needed.
2. For the "Messages" section inside each project, should it be a new tab in the project navigation alongside Tasks/Kanban, or a collapsible sidebar panel? I will assume a new "Messages" tab inside the project view for now.

## Proposed Changes

### 1. Database Migrations (Supabase)

We will create a new SQL migration file to add the necessary tables for messaging.

#### [NEW] `supabase/migrations/XXXXXXXXXXXXXX_create_messaging_tables.sql`
- Create `conversations` table.
- Create `conversation_members` table.
- Create `messages` table.
- Enable realtime for the `messages` table.
- Add constraints (e.g., unique constraint on conversation members to prevent duplicate 1-to-1 chats in the same project).
- As requested, no RLS will be implemented; all access control will be handled in application logic.

### 2. Application Core Logic (Server Actions)

We will create robust server actions to handle the data logic securely.

#### [NEW] `src/features/messages/actions/conversations.action.ts`
- **Membership Validation**: `verifyProjectMembership(projectId, userId)` helper.
- **`getOrCreateConversation`**: 
  - Validates that both users belong to the `projectId`.
  - Checks if a 1-to-1 conversation already exists for these two users in this project.
  - Returns existing `conversation_id` or creates a new conversation and its member records.
- **`getUserConversations`**: Fetches all conversations (and the other member's details) for the current user in a specific project.

#### [NEW] `src/features/messages/actions/messages.action.ts`
- **Conversation Validation**: `verifyConversationMembership(conversationId, userId)` helper.
- **`getMessages`**: Fetches message history for a conversation, restricted to conversation members.
- **`sendMessage`**: Inserts a new message after verifying the sender is a member of the conversation.

### 3. Realtime Implementation Hooks

We will build custom React hooks to manage realtime state and subscriptions.

#### [NEW] `src/features/messages/hooks/use-chat-realtime.ts`
- Uses Supabase JS client to subscribe to `postgres_changes` on the `messages` table.
- Filters events by `conversation_id=eq.${activeConversationId}`.
- Handles appending new messages to the UI state and avoiding duplicate events (by checking message IDs).
- Manages auto-scrolling to the bottom when new messages arrive.

### 4. UI Components

We will build the interface inside the project view.

#### [NEW] `src/features/messages/components/messages-view.tsx`
- The main container for the "Messages" tab in a project.
- Split layout: A sidebar listing project members / recent conversations, and a main chat area.

#### [NEW] `src/features/messages/components/conversation-list.tsx`
- Lists available project members to chat with.
- Highlights unread message counts (calculated dynamically or via a DB function).

#### [NEW] `src/features/messages/components/chat-box.tsx`
- Displays the message history (sender name, avatar, content, timestamp).
- Includes the `MessageInput` component for typing and sending messages.
- Implements auto-scrolling to the latest messages.

#### [MODIFY] `src/features/project/components/project-layout.tsx` (or similar navigation file)
- Add a "Messages" tab to the project navigation to access the new messaging view.

## Verification Plan

### Manual Verification
1. **Validation Flow**: Attempt to fetch or send messages to a conversation the user is not a part of. Verify the server action rejects the request.
2. **Conversation Creation**: Click on a project member; verify a conversation is created. Click them again; verify the existing conversation is loaded without duplicates.
3. **Realtime**: Open the chat as User A in one browser and User B in another. Send a message from A to B and verify B receives it instantly without page refresh.
4. **UI**: Verify auto-scroll works when the chat exceeds the container height, and that sender/receiver messages are visually distinct.
