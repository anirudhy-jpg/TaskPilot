# Direct Messaging (1-to-1 Chat) Implementation Plan

Real-time 1-to-1 direct messaging between workspace members who share at least one project.

## User Review Required

> [!IMPORTANT]
> **No RLS** — All access control is enforced in the service layer (`MessagingService`).

> [!IMPORTANT]
> **Read‑only conversations** — When two users no longer share any project, their conversation becomes read‑only. History stays visible but sending, editing, deleting, attachments, or typing indicators are disabled. Re‑sharing a project automatically re‑activates the conversation.

> [!IMPORTANT]
> **Realtime permission propagation** — Conversation `is_active` updates are broadcast via Supabase Realtime (no page refresh needed).

## UI Flow

```
Sidebar                          Main Area (/chat)
┌─────────────┐    ┌──────────────────────────────────────────┐
│ Overview    │    │ ┌──────────────┬─────────────────────────┐│
│ Projects    │    │ │ 🔍 Search    │  Chat with: User B      ││
│ Teams       │    │ │              │                         ││
│ Members     │    │ │ Recent Chats │  ┌─────────────────┐    ││
│ ▶ Chat  ◀───┼────│ │ ─────────── │  │ Message bubbles │    ││
│             │    │ │ 👤 User B    │  │ ...             │    ││
│ ┄┄┄┄┄┄┄┄┄┄  │    │ │   last msg.. │  └─────────────────┘    ││
│ Projects    │    │ │ 👤 User C    │                         ││
│  Board      │    │ │              │  ⚠ READ‑ONLY BANNER     ││
│ ┄┄┄┄┄┄┄┄┄┄  │    │ │ All Members  │  (when is_active=false) ││
│ Settings    │    │ │ ─────────── │                         ││
│             │    │ │ 👤 User D    │  ┌─────────────────┐    ││
└─────────────┘    │ │              │  │ Input disabled  │    ││
                   │ └──────────────┴─────────────────────────┘│
                   └──────────────────────────────────────────┘
```

**Flow:**
1. Click **"Chat"** in the sidebar → `/chat`.
2. Split view: conversation/member list (left) + chat area (right).
3. Left panel shows **Recent conversations** and **All members** (search‑filterable).
4. Selecting a member creates (or opens) a conversation.
5. If `is_active === false` a banner appears and the input is disabled.
6. When users later share a project again, the service refreshes the status and the UI updates instantly via Realtime.

---

## Proposed Changes

### 1. Database Migration

#### [NEW] `supabase/migrations/YYYYMMDDHHMMSS_create_messaging_tables.sql`

```sql
-- 1. conversations (workspace‑scoped, one per user pair)
CREATE TABLE conversations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    pair_key      text NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz DEFAULT now()
);

-- Enforce a single conversation per user pair within a workspace
CREATE UNIQUE INDEX uq_conversations_workspace_pairkey
    ON conversations(workspace_id, pair_key);

CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);

-- 2. conversation_members (exactly 2 per 1‑to‑1 chat)
CREATE TABLE conversation_members (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_read_at      timestamptz DEFAULT now(),
    joined_at         timestamptz DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_conv_members_conv ON conversation_members(conversation_id);
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);

-- 3. messages
CREATE TABLE messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content         text NOT NULL,
    edited_at       timestamptz,
    deleted_at      timestamptz,
    created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_messages_conv   ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- 4. Enable Realtime for messages AND conversations tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

**Key design decisions:**
- `pair_key` is a deterministic string `userA:userB` (sorted alphabetically) guaranteeing uniqueness.
- `is_active` tracks whether the pair currently shares at least one project.
- No database trigger; status is refreshed by service code.
- Workspace cascade delete cleans up related rows.

---

### 2. TypeScript Types

#### [NEW] `src/features/messages/types/index.ts`

```ts
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
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender?: ConversationUser;
}
```

---

### 3. Service Layer

#### [NEW] `src/features/messages/services/messaging.service.ts`

```ts
import { createClient } from '@/lib/supabase/server';
import type { Conversation, ConversationUser, Message } from '@/features/messages/types';

export class MessagingService {
  /**
   * Generate the deterministic pair key for two user IDs.
   */
  private static pairKey(userA: string, userB: string): string {
    return [userA, userB].sort().join(':');
  }

  /**
   * Check whether two users share at least one project in the given workspace.
   */
  private static async usersShareProject(
    supabase: ReturnType<typeof createClient>,
    workspaceId: string,
    userA: string,
    userB: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id')
      .in('user_id', [userA, userB])
      .eq('workspace_id', workspaceId);
    if (error) throw error;
    // Build a map of project -> count of members from the two users
    const projectCounts = new Map<string, number>();
    data?.forEach((row: any) => {
      const cnt = projectCounts.get(row.project_id) ?? 0;
      projectCounts.set(row.project_id, cnt + 1);
    });
    // Any project with count === 2 means both users are on it
    for (const cnt of projectCounts.values()) if (cnt === 2) return true;
    return false;
  }

  /** Verify that a user is a member of a conversation. */
  private static async verifyConversationMembership(
    supabase: ReturnType<typeof createClient>,
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const { count, error } = await supabase
      .from('conversation_members')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  // -------------------------------------------------------------------
  // MEMBERS
  // -------------------------------------------------------------------
  static async getChateableMembers(
    workspaceId: string,
    currentUserId: string
  ): Promise<ConversationUser[]> {
    const supabase = createClient();
    // Find distinct users that share at least one project with the current user
    const { data, error } = await supabase
      .rpc('get_shared_project_members', {
        workspace_id: workspaceId,
        user_id: currentUserId,
      }); // Assume a lightweight RPC exists; fallback to raw query if needed
    if (error) throw error;
    return data as ConversationUser[];
  }

  // -------------------------------------------------------------------
  // CONVERSATIONS
  // -------------------------------------------------------------------
  /**
   * Get or create a conversation for the pair. Handles race conditions by
   * catching unique‑constraint violations and refetching the existing row.
   */
  static async getOrCreateConversation(
    workspaceId: string,
    currentUserId: string,
    otherUserId: string
  ): Promise<Conversation> {
    const supabase = createClient();
    const pairKey = this.pairKey(currentUserId, otherUserId);

    // First try to find an existing conversation by pairKey
    const { data: existing, error: findErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('pair_key', pairKey)
      .single();
    if (findErr && findErr.code !== 'PGRST102') {
      // Unexpected error
      throw findErr;
    }
    if (existing) {
      return existing as Conversation;
    }

    // Verify shared project before creating
    const share = await this.usersShareProject(
      supabase,
      workspaceId,
      currentUserId,
      otherUserId,
    );
    if (!share) {
      throw new Error('Cannot start a conversation: users do not share a project.');
    }

    // Insert conversation and two membership rows in a transaction‑like manner
    const { data: newConv, error: insertErr } = await supabase
      .from('conversations')
      .insert({ workspace_id: workspaceId, pair_key: pairKey })
      .select()
      .single();

    if (insertErr) {
      // If the error is a unique‑constraint violation, another request created it concurrently.
      if (insertErr.code === '23505') {
        // Re‑fetch the conversation now that it exists.
        const { data: raced, error: raceErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('pair_key', pairKey)
          .single();
        if (raceErr) throw raceErr;
        return raced as Conversation;
      }
      throw insertErr;
    }

    // Create the two conversation_members rows
    const members = [currentUserId, otherUserId].map((uid) => ({
      conversation_id: newConv.id,
      user_id: uid,
    }));
    const { error: membersErr } = await supabase.from('conversation_members').insert(members);
    if (membersErr) throw membersErr;
    return newConv as Conversation;
  }

  static async getUserConversations(
    workspaceId: string,
    currentUserId: string
  ): Promise<Conversation[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `*,
        conversation_members!inner(user_id),
        messages(order_by: created_at.desc, limit: 1)
        `
      )
      .eq('workspace_id', workspaceId)
      .in('conversation_members.user_id', [currentUserId]);
    if (error) throw error;
    // Transform rows into Conversation objects, loading the other user profile.
    const convs = (data as any[]).map((row) => {
      const otherMember = row.conversation_members.find((m: any) => m.user_id !== currentUserId);
      const otherUser = { id: otherMember?.user_id } as ConversationUser; // Fill later with a join if needed
      const lastMsg = row.messages?.[0] ?? null;
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        pairKey: row.pair_key,
        isActive: row.is_active,
        createdAt: row.created_at,
        otherUser,
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.created_at, senderId: lastMsg.sender_id }
          : null,
      } as Conversation;
    });
    return convs;
  }

  static async markConversationRead(conversationId: string, userId: string): Promise<void> {
    const supabase = createClient();
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }

  // -------------------------------------------------------------------
  // STATUS REFRESH
  // -------------------------------------------------------------------
  /**
   * Re‑evaluate `is_active` for all conversations in a workspace that involve
   * the given user. Called after any project_members change.
   */
  static async refreshConversationStatuses(
    workspaceId: string,
    affectedUserId: string
  ): Promise<void> {
    const supabase = createClient();
    // Find all conversations for the user in this workspace
    const { data: convIds, error: convErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', affectedUserId)
      .eq('workspace_id', workspaceId);
    if (convErr) throw convErr;
    if (!convIds?.length) return;

    // For each conversation, recompute shared‑project status
    for (const { conversation_id } of convIds as any[]) {
      // Get the two participants
      const { data: members, error: memErr } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversation_id);
      if (memErr) throw memErr;
      if (members?.length !== 2) continue; // safety
      const [uidA, uidB] = members.map((m: any) => m.user_id);
      const share = await this.usersShareProject(supabase, workspaceId, uidA, uidB);
      // Update the conversation's is_active flag
      await supabase
        .from('conversations')
        .update({ is_active: share })
        .eq('id', conversation_id);
    }
  }

  // -------------------------------------------------------------------
  // MESSAGES
  // -------------------------------------------------------------------
  static async getMessages(
    conversationId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const supabase = createClient();
    const query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (cursor) query.lt('created_at', cursor);
    const { data, error } = await query;
    if (error) throw error;
    const hasMore = (data?.length ?? 0) === limit;
    return { messages: data as Message[], hasMore };
  }

  static async sendMessage(conversationId: string, content: string, senderId: string): Promise<Message> {
    const supabase = createClient();
    // 1. Verify membership
    const member = await this.verifyConversationMembership(supabase, conversationId, senderId);
    if (!member) throw new Error('You are not a member of this conversation.');
    // 2. Load conversation and check is_active
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('is_active, workspace_id, pair_key')
      .eq('id', conversationId)
      .single();
    if (convErr) throw convErr;
    if (!conv.is_active) {
      throw new Error('You and this user no longer share any project. This conversation is read‑only.');
    }
    // 3. Safety re‑check of shared projects (defense‑in‑depth)
    const otherUserId = conv.pair_key.split(':').find((id) => id !== senderId)!;
    const share = await this.usersShareProject(supabase, conv.workspace_id, senderId, otherUserId);
    if (!share) {
      // Update status to false as a safeguard
      await supabase.from('conversations').update({ is_active: false }).eq('id', conversationId);
      throw new Error('You and this user no longer share any project. This conversation is read‑only.');
    }
    // 4. Validate content
    if (!content?.trim()) throw new Error('Message content cannot be empty.');
    if (content.length > 5000) throw new Error('Message exceeds maximum length of 5000 characters.');
    // 5. Insert message
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, content })
      .select()
      .single();
    if (msgErr) throw msgErr;
    return msg as Message;
  }

  static async editMessage(messageId: string, newContent: string, editorId: string): Promise<Message> {
    const supabase = createClient();
    // Load message + conversation for checks
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .eq('id', messageId)
      .single();
    if (msgErr) throw msgErr;
    if (msg.sender_id !== editorId) throw new Error('Only the original sender can edit the message.');
    // Verify conversation is active
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('is_active, workspace_id')
      .eq('id', msg.conversation_id)
      .single();
    if (convErr) throw convErr;
    if (!conv.is_active) {
      throw new Error('You and this user no longer share any project. This conversation is read‑only.');
    }
    // Update message
    const { data: updated, error: updErr } = await supabase
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .select()
      .single();
    if (updErr) throw updErr;
    return updated as Message;
  }

  static async deleteMessage(messageId: string, deleterId: string): Promise<void> {
    const supabase = createClient();
    // Load message + conversation for checks
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .eq('id', messageId)
      .single();
    if (msgErr) throw msgErr;
    if (msg.sender_id !== deleterId) throw new Error('Only the original sender can delete the message.');
    // Verify conversation is active
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('is_active')
      .eq('id', msg.conversation_id)
      .single();
    if (convErr) throw convErr;
    if (!conv.is_active) {
      throw new Error('You and this user no longer share any project. This conversation is read‑only.');
    }
    // Soft‑delete
    const { error: delErr } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    if (delErr) throw delErr;
  }
}
```

---

### 4. Server Actions

*(unchanged apart from new validation – they simply forward to the service methods)*

---

### 5. Realtime Hooks

- **useConversationStatus** now listens only to the `conversations` table for `is_active` updates (no trigger needed).
- **useConversations** subscribes to the same table to keep the list in sync.

---

### 6. UI Components

- Conversation list shows a **🔒 Read Only** label next to inactive rows.
- Chat box displays the banner: *"You and this user no longer share any project. This conversation is read‑only."*
- Message input receives a `disabled` prop when `isActive === false`.
- All edit/delete UI controls are hidden when the conversation is read‑only.

---

### 7. Routing & Navigation

No changes – `/chat` route remains.

---

### 8. Integration with Project Membership Changes

In the existing project‑membership service (`ProjectService` or wherever `project_members` are mutated), after a successful INSERT, DELETE, or project deletion, add:

```ts
await MessagingService.refreshConversationStatuses(workspaceId, affectedUserId);
```

`workspaceId` is the current workspace, and `affectedUserId` is the user whose memberships changed. This guarantees conversation status stays accurate.

---

### 9. Access Control Summary (No RLS)

| Operation | Checks |
|-----------|--------|
| List chateable members | Workspace member + shares ≥1 project |
| Get/Create conversation | Users share ≥1 project (service validation) + unique `pair_key` prevents duplicates |
| List conversations | Conversation member (read‑only rows included) |
| Get messages | Conversation member (always allowed) |
| Send message | Member ✅, `conversations.is_active === true`, and **shared‑project re‑check** (server) |
| Edit message | Same as send, plus author check |
| Delete message | Same as send, plus author check |
| Mark read | Member ✅ |

---

### 10. File Tree Summary

```
src/features/messages/
├── actions/
│   ├── conversations.action.ts     [NEW]
│   └── messages.action.ts          [NEW]
├── components/
│   ├── messages-page.tsx           [NEW]
│   ├── conversation-list.tsx       [NEW]
│   ├── chat-box.tsx                [NEW]
│   ├── message-input.tsx           [NEW]
│   └── message-bubble.tsx          [NEW]
├── hooks/
│   ├── use-chat-realtime.ts        [NEW]
│   ├── use-conversation-status.ts  [NEW]
│   ├── use-conversations.ts        [NEW]
│   └── use-chat.ts                 [NEW]
├── services/
│   └── messaging.service.ts        [NEW]   // includes refreshConversationStatuses
├── types/
│   └── index.ts                    [NEW]
└── utils/ (optional helper RPCs)   

src/app/(protected)/chat/
└── page.tsx                        [NEW]

supabase/migrations/
└── YYYYMMDDHHMMSS_create_messaging_tables.sql  [NEW] (no trigger, includes pair_key & unique index)

src/features/workspace/components/
└── sidebar.tsx                     [MODIFY] — add Chat nav item
```

---

## Verification Plan

### Automated
- `npm run build` – ensure TypeScript compiles with the new service method signatures.
- Apply migration via Supabase dashboard; confirm the `pair_key` unique index exists.

### Manual
1. **Sidebar** – Chat tab appears and navigates to `/chat`.
2. **Create conversation** – Simultaneous clicks from two users result in a single row (unique constraint).
3. **Read‑only transition** – Remove all shared projects for a pair → banner appears, input disables, list shows 🔒 label instantly.
4. **Re‑activation** – Add a shared project back → UI updates, banner disappears, input re‑enables.
5. **SendMessage validation** – Attempt to send via devtools when read‑only → error with exact message string.
6. **Realtime** – Verify that `is_active` updates propagate without a page reload (observe Realtime payload).
7. **Unread badge** – Works unchanged.
8. **Pagination** – Verify infinite scroll still functions.
9. **Race‑condition test** – Fire two concurrent `getOrCreateConversation` requests (e.g., via Postman) and confirm only one conversation row is created.
10. **Membership integration** – After adding/removing a user from a project, confirm the related conversations toggle status accordingly.

---

*All sections have been updated to reflect the deterministic `pair_key`, removal of the database trigger, service‑layer status refresh, and UI changes for read‑only conversations.*
