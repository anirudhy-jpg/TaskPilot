import { createClient } from '@/lib/supabase/server';
import type { Conversation, ConversationUser, Message } from '@/features/messages/types';
import { CHAT_LIMITS } from '../constants';

export class MessagingService {
  /**
   * Generate the deterministic pair key for two user IDs.
   */
  private static pairKey(userA: string, userB: string): string {
    return [userA, userB].sort().join(':');
  }

  /**
   * Check whether two users are in the given workspace.
   */
  private static async usersShareWorkspace(
    supabase: any,
    workspaceId: string,
    userA: string,
    userB: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .in('user_id', [userA, userB]);
      
    if (error) throw error;
    return data && data.length === 2;
  }

  /** Verify that a user is a member of a conversation. */
  private static async verifyConversationMembership(
    supabase: any,
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

  /** Get detailed info about shared projects for UI display. */
  static async getSharedProjectsInfo(
    workspaceId: string,
    userA: string,
    userB: string
  ): Promise<{ count: number; names: string[] }> {
    const supabase = await createClient();
    
    const { data: myProjects, error: err1 } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userA);
      
    if (err1) throw err1;
    if (!myProjects || myProjects.length === 0) return { count: 0, names: [] };
    
    const myProjectIds = myProjects.map((p: any) => p.project_id);
    
    const { data: sharedProjects, error: err2 } = await supabase
      .from('project_members')
      .select('project_id, projects!inner(name, workspace_id)')
      .in('project_id', myProjectIds)
      .eq('user_id', userB)
      .eq('projects.workspace_id', workspaceId);
      
    if (err2) throw err2;
    
    if (!sharedProjects || sharedProjects.length === 0) return { count: 0, names: [] };
    
    const names = sharedProjects.map((p: any) => p.projects.name);
    return { count: names.length, names };
  }

  // -------------------------------------------------------------------
  // MEMBERS
  // -------------------------------------------------------------------
  static async getChateableMembers(
    workspaceId: string,
    currentUserId: string
  ): Promise<ConversationUser[]> {
    const supabase = await createClient();
    
    // Everyone can chat with everyone in the workspace
    const { data: allMembers, error: allErr } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .neq('user_id', currentUserId);
      
    if (allErr) throw allErr;
    const eligibleUserIds = (allMembers || []).map((m: any) => m.user_id);

    if (eligibleUserIds.length === 0) return [];

    // 2. Fetch distinct user profiles
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', eligibleUserIds);

    if (profErr) throw profErr;

    return (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
    }));
  }

  // -------------------------------------------------------------------
  // CONVERSATIONS
  // -------------------------------------------------------------------
  static async getOrCreateConversation(
    workspaceId: string,
    currentUserId: string,
    otherUserId: string
  ): Promise<Conversation> {
    const supabase = await createClient();
    const pairKey = this.pairKey(currentUserId, otherUserId);

    // First try to find an existing conversation by pairKey
    const { data: existing, error: findErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('pair_key', pairKey)
      .single();
      
    if (findErr && findErr.code !== 'PGRST116') {
      throw findErr;
    }
    
    if (existing) {
      return existing as Conversation;
    }

    // Verify workspace membership before creating
    const share = await this.usersShareWorkspace(
      supabase,
      workspaceId,
      currentUserId,
      otherUserId
    );
    
    if (!share) {
      throw new Error('Cannot start a conversation: both users must be in the same workspace.');
    }

    // Insert conversation and two membership rows
    const { data: newConv, error: insertErr } = await supabase
      .from('conversations')
      .insert({ workspace_id: workspaceId, pair_key: pairKey })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
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
    const supabase = await createClient();
    
    // First find all conversation IDs for this user
    const { data: myMemberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUserId);
      
    if (memErr) throw memErr;
    if (!myMemberships || myMemberships.length === 0) return [];
    
    const conversationIds = myMemberships.map((m: any) => m.conversation_id);
    
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `*,
        messages(content, created_at, sender_id)
        `
      )
      .eq('workspace_id', workspaceId)
      .in('id', conversationIds)
      .order('created_at', { referencedTable: 'messages', ascending: false })
      .limit(1, { referencedTable: 'messages' });
      
    if (error) throw error;
    
    const conversationData = data as any[];

    // Fetch unread counts
    const unreadCounts = await Promise.all(
      myMemberships.map(async (m: any) => {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', m.conversation_id)
          .neq('sender_id', currentUserId)
          .is('deleted_at', null)
          .gt('created_at', m.last_read_at || '1970-01-01T00:00:00Z');
        return { conversationId: m.conversation_id, count: count || 0 };
      })
    );
    const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u.count]));
    
    // Extract other user IDs from pairKey
    const otherUserIds = Array.from(new Set(
      conversationData.map(row => {
        const parts = row.pair_key.split(':');
        return parts[0] === currentUserId ? parts[1] : parts[0];
      })
    ));
    
    if (otherUserIds.length === 0) return [];

    // Fetch profiles for the other users
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', otherUserIds);
      
    if (profErr) throw profErr;
    
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

    const convs = conversationData.map((row) => {
      const parts = row.pair_key.split(':');
      const otherUserId = parts[0] === currentUserId ? parts[1] : parts[0];
      const otherProfile = profileMap.get(otherUserId);
      
      const otherUser: ConversationUser = {
        id: otherUserId,
        email: otherProfile?.email || '',
        fullName: otherProfile?.full_name || null,
        avatarUrl: otherProfile?.avatar_url || null,
      };
      
      const lastMsg = row.messages?.[0] ?? null;
      
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        pairKey: row.pair_key,
        isActive: row.is_active,
        createdAt: row.created_at,
        otherUser,
        unreadCount: unreadMap.get(row.id) || 0,
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.created_at, senderId: lastMsg.sender_id }
          : null,
      } as Conversation;
    });
    
    return convs.sort((a, b) => {
      const aDate = a.lastMessage?.createdAt || a.createdAt;
      const bDate = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }

  static async markConversationRead(conversationId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }

  static async hasAnyUnreadMessages(userId: string): Promise<boolean> {
    const supabase = await createClient();
    
    // First find all conversation IDs and last_read_at for this user
    const { data: myMemberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);
      
    if (memErr) throw memErr;
    if (!myMemberships || myMemberships.length === 0) return false;
    
    // Check if any conversation has unread messages
    for (const m of myMemberships) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', m.conversation_id)
        .neq('sender_id', userId)
        .is('deleted_at', null)
        .gt('created_at', m.last_read_at || '1970-01-01T00:00:00Z')
        .limit(1);
        
      if (count && count > 0) return true;
    }
    
    return false;
  }

  // -------------------------------------------------------------------
  // STATUS REFRESH
  // -------------------------------------------------------------------
  static async refreshConversationStatuses(
    workspaceId: string,
    affectedUserId: string
  ): Promise<void> {
    const supabase = await createClient();
    const { data: convIds, error: convErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', affectedUserId);
      
    if (convErr) throw convErr;
    if (!convIds?.length) return;

    for (const { conversation_id } of convIds as any[]) {
      const { data: members, error: memErr } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversation_id);
        
      if (memErr) throw memErr;
      if (members?.length !== 2) continue;
      
      const [uidA, uidB] = members.map((m: any) => m.user_id);
      const share = await this.usersShareWorkspace(supabase, workspaceId, uidA, uidB);
      
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
    const supabase = await createClient();
    const query = supabase
      .from('messages')
      .select('*, profiles!inner(id, email, full_name, avatar_url), message_reactions(id, message_id, user_id, emoji, created_at, profiles!inner(id, email, full_name, avatar_url))')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (cursor) query.lt('created_at', cursor);
    const { data, error } = await query;
    if (error) throw error;
    
    const hasMore = (data?.length ?? 0) === limit;
    
    // Batch load replied messages
    const replyIds = [...new Set(data?.map((m: any) => m.reply_to_message_id).filter(Boolean))] as string[];
    const replyMap = new Map();
    if (replyIds.length > 0) {
      const { data: replies, error: replyErr } = await supabase
        .from('messages')
        .select('id, content, deleted_at, profiles!inner(id, email, full_name, avatar_url)')
        .in('id', replyIds);
      if (!replyErr && replies) {
        replies.forEach((r: any) => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          replyMap.set(r.id, {
            id: r.id,
            content: r.content,
            deletedAt: r.deleted_at,
            sender: {
              id: profile.id,
              email: profile.email,
              fullName: profile.full_name,
              avatarUrl: profile.avatar_url,
            }
          });
        });
      }
    }

    const messages = data?.map((msg: any) => {
      const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
      return {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        content: msg.content,
        attachmentName: msg.attachment_name,
        attachmentPath: msg.attachment_path,
        attachmentSize: msg.attachment_size,
        attachmentMimeType: msg.attachment_mime_type,
        attachmentUploadedAt: msg.attachment_uploaded_at,
        replyToMessageId: msg.reply_to_message_id,
        replyToMessage: msg.reply_to_message_id ? replyMap.get(msg.reply_to_message_id) || null : null,
        editedAt: msg.edited_at,
        deletedAt: msg.deleted_at,
        createdAt: msg.created_at,
        reactions: msg.message_reactions?.map((r: any) => {
          const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            id: r.id,
            messageId: r.message_id,
            userId: r.user_id,
            emoji: r.emoji,
            createdAt: r.created_at,
            user: {
              id: rProfile.id,
              email: rProfile.email,
              fullName: rProfile.full_name,
              avatarUrl: rProfile.avatar_url,
            }
          };
        }) || [],
        sender: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
        }
      };
    }) as Message[];

    return { messages, hasMore };
  }

  static async sendMessage(
    conversationId: string, 
    content: string, 
    senderId: string,
    attachment?: {
      name: string;
      path: string;
      size: number;
      mimeType: string;
    },
    replyToMessageId?: string
  ): Promise<Message> {
    const supabase = await createClient();
    const member = await this.verifyConversationMembership(supabase, conversationId, senderId);
    if (!member) throw new Error('You are not a member of this conversation.');
    
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('is_active, workspace_id, pair_key')
      .eq('id', conversationId)
      .single();
      
    if (convErr) throw convErr;
    if (!conv.is_active) {
      throw new Error('You and this user are no longer in the same workspace. This conversation is read‑only.');
    }
    
    const otherUserId = conv.pair_key.split(':').find((id: string) => id !== senderId)!;
    const share = await this.usersShareWorkspace(supabase, conv.workspace_id, senderId, otherUserId);
    if (!share) {
      await supabase.from('conversations').update({ is_active: false }).eq('id', conversationId);
      throw new Error('You and this user are no longer in the same workspace. This conversation is read‑only.');
    }
    
    if (!content?.trim() && !attachment) throw new Error('Message must contain at least text or an attachment.');
    if (content && content.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) throw new Error(`Message exceeds maximum length of ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters.`);
    if (attachment && attachment.size > CHAT_LIMITS.MAX_ATTACHMENT_SIZE_BYTES) throw new Error(`Attachment exceeds maximum size of ${CHAT_LIMITS.MAX_ATTACHMENT_SIZE_MB}MB.`);
    
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({ 
        conversation_id: conversationId, 
        sender_id: senderId, 
        content,
        attachment_name: attachment?.name,
        attachment_path: attachment?.path,
        attachment_size: attachment?.size,
        attachment_mime_type: attachment?.mimeType,
        attachment_uploaded_at: attachment ? new Date().toISOString() : null,
        reply_to_message_id: replyToMessageId || null,
      })
      .select('*, profiles!inner(id, email, full_name, avatar_url)')
      .single();
      
    if (msgErr) throw msgErr;
    
    let replyToMessage = null;
    if (msg.reply_to_message_id) {
      const { data } = await supabase
        .from('messages')
        .select('id, content, deleted_at, profiles!inner(id, email, full_name, avatar_url)')
        .eq('id', msg.reply_to_message_id)
        .single();
        
      if (data) {
        const rMsg = data as any;
        const profile = Array.isArray(rMsg.profiles) ? rMsg.profiles[0] : rMsg.profiles;
        replyToMessage = {
          id: rMsg.id,
          content: rMsg.content,
          deletedAt: rMsg.deleted_at,
          sender: {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
          }
        };
      }
    }
    
    const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
    
    return {
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      attachmentName: msg.attachment_name,
      attachmentPath: msg.attachment_path,
      attachmentSize: msg.attachment_size,
      attachmentMimeType: msg.attachment_mime_type,
      attachmentUploadedAt: msg.attachment_uploaded_at,
      replyToMessageId: msg.reply_to_message_id,
      replyToMessage,
      editedAt: msg.edited_at,
      deletedAt: msg.deleted_at,
      createdAt: msg.created_at,
      sender: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
      }
    } as Message;
  }

  static async editMessage(messageId: string, newContent: string, editorId: string): Promise<Message> {
    const supabase = await createClient();
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, created_at')
      .eq('id', messageId)
      .single();
      
    if (msgErr) throw msgErr;
    if (msg.sender_id !== editorId) throw new Error('Only the original sender can edit the message.');
    
    if (new Date().getTime() - new Date(msg.created_at).getTime() > CHAT_LIMITS.EDIT_WINDOW_MS) {
      throw new Error(`Messages can only be edited within ${CHAT_LIMITS.EDIT_WINDOW_MINUTES} minutes.`);
    }
    
    if (newContent && newContent.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters.`);
    }
    
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('is_active')
      .eq('id', msg.conversation_id)
      .single();
      
    if (convErr) throw convErr;
    if (!conv.is_active) {
      throw new Error('You and this user are no longer in the same workspace. This conversation is read‑only.');
    }
    
    const { data: updated, error: updErr } = await supabase
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .select('*, profiles!inner(id, email, full_name, avatar_url)')
      .single();
      
    if (updErr) throw updErr;

    let replyToMessage = null;
    if (updated.reply_to_message_id) {
      const { data } = await supabase
        .from('messages')
        .select('id, content, deleted_at, profiles!inner(id, email, full_name, avatar_url)')
        .eq('id', updated.reply_to_message_id)
        .single();
        
      if (data) {
        const rMsg = data as any;
        const profile = Array.isArray(rMsg.profiles) ? rMsg.profiles[0] : rMsg.profiles;
        replyToMessage = {
          id: rMsg.id,
          content: rMsg.content,
          deletedAt: rMsg.deleted_at,
          sender: {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
          }
        };
      }
    }
    
    const profile = Array.isArray(updated.profiles) ? updated.profiles[0] : updated.profiles;

    return {
      id: updated.id,
      conversationId: updated.conversation_id,
      senderId: updated.sender_id,
      content: updated.content,
      replyToMessageId: updated.reply_to_message_id,
      replyToMessage,
      editedAt: updated.edited_at,
      deletedAt: updated.deleted_at,
      createdAt: updated.created_at,
      sender: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
      }
    } as Message;
  }

  static async deleteMessage(messageId: string, deleterId: string): Promise<void> {
    const supabase = await createClient();
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .eq('id', messageId)
      .single();
      
    if (msgErr) throw msgErr;
    if (msg.sender_id !== deleterId) throw new Error('Only the original sender can delete the message.');
    
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('is_active')
      .eq('id', msg.conversation_id)
      .single();
      
    if (convErr) throw convErr;
    if (!conv.is_active) {
      throw new Error('You and this user are no longer in the same workspace. This conversation is read‑only.');
    }
    
    const { error: delErr } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
      
    if (delErr) throw delErr;
  }

  // -------------------------------------------------------------------
  // REACTIONS
  // -------------------------------------------------------------------
  static async toggleReaction(messageId: string, emoji: string, userId: string): Promise<void> {
    const supabase = await createClient();
    
    // First check if the user is a member of the conversation this message belongs to
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', messageId)
      .single();
      
    if (msgErr) throw msgErr;
    
    const member = await this.verifyConversationMembership(supabase, msg.conversation_id, userId);
    if (!member) throw new Error('You are not a member of this conversation.');

    // Check if reaction exists
    const { data: existing, error: existErr } = await supabase
      .from('message_reactions')
      .select('id, emoji')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .single();

    if (existErr && existErr.code !== 'PGRST116') {
      throw existErr;
    }

    if (existing) {
      if (existing.emoji === emoji) {
        // Remove if it's the same emoji
        const { error: delErr } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
        if (delErr) throw delErr;
      } else {
        // Update if it's a different emoji
        const { error: updErr } = await supabase
          .from('message_reactions')
          .update({ emoji })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      }
    } else {
      // Insert new reaction
      const { error: insErr } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji,
        });
      if (insErr) throw insErr;
    }
  }
}
