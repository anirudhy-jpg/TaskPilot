import { createClient } from "@/lib/supabase/server"
import type { TaskComment, TimelineItem, TaskActivityType } from "@/features/project/types/project.types"

export class TaskTimelineService {
  /**
   * Fetch both activities and comments for a task and merge them into a sorted timeline.
   */
  static async getTaskTimeline(taskId: string, limit = 50): Promise<TimelineItem[]> {
    const supabase = await createClient()

    const [activitiesRes, commentsRes] = await Promise.all([
      supabase
        .from("task_activities")
        .select(`
          id, task_id, actor_id, action_type, old_value, new_value, metadata, created_at,
          actor:profiles!task_activities_actor_id_fkey(email, full_name, avatar_url)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("task_comments")
        .select(`
          id, task_id, author_id, content, edited, created_at, updated_at,
          author:profiles!task_comments_author_id_fkey(email, full_name, avatar_url),
          mentions:task_comment_mentions(
            id, comment_id, mentioned_user_id, created_at,
            mentioned_user:profiles!task_comment_mentions_mentioned_user_id_fkey(email, full_name, avatar_url)
          )
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(limit)
    ])

    if (activitiesRes.error) {
      console.error("Error fetching activities:", activitiesRes.error)
      throw new Error(activitiesRes.error.message)
    }

    if (commentsRes.error) {
      console.error("Error fetching comments:", commentsRes.error)
      throw new Error(commentsRes.error.message)
    }

    type ActivityRow = {
      id: string; task_id: string; actor_id: string | null;
      action_type: string; old_value: unknown; new_value: unknown;
      metadata: Record<string, unknown> | null; created_at: string;
      actor: { email: string; full_name: string | null; avatar_url: string | null } | { email: string; full_name: string | null; avatar_url: string | null }[] | null;
    };
    const activities = (activitiesRes.data || []).map((row: ActivityRow) => {
      const actorData = Array.isArray(row.actor) ? row.actor[0] : row.actor
      return {
        type: "activity" as const,
        id: row.id,
        taskId: row.task_id,
        actorId: row.actor_id,
        actionType: row.action_type as TaskActivityType,
        oldValue: row.old_value,
        newValue: row.new_value,
        metadata: row.metadata,
        createdAt: row.created_at,
        actor: actorData ? {
          email: actorData.email,
          fullName: actorData.full_name,
          avatarUrl: actorData.avatar_url,
        } : undefined
      }
    })

    type MentionRow = {
      id: string; comment_id: string; mentioned_user_id: string; created_at: string;
      mentioned_user: { email: string; full_name: string | null; avatar_url: string | null } | { email: string; full_name: string | null; avatar_url: string | null }[] | null;
    };
    type CommentRow = {
      id: string; task_id: string; author_id: string; content: string;
      edited: boolean; created_at: string; updated_at: string;
      author: { email: string; full_name: string | null; avatar_url: string | null } | { email: string; full_name: string | null; avatar_url: string | null }[] | null;
      mentions: MentionRow[];
    };
    const comments = (commentsRes.data || []).map((row: CommentRow) => {
      const authorData = Array.isArray(row.author) ? row.author[0] : row.author
      return {
        type: "comment" as const,
        id: row.id,
        taskId: row.task_id,
        authorId: row.author_id,
        content: row.content,
        edited: row.edited,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        author: authorData ? {
          email: authorData.email,
          fullName: authorData.full_name,
          avatarUrl: authorData.avatar_url,
        } : undefined,
        mentions: (row.mentions || []).map((m: MentionRow) => {
          const mentionedUser = Array.isArray(m.mentioned_user) ? m.mentioned_user[0] : m.mentioned_user
          return {
            id: m.id,
            commentId: m.comment_id,
            mentionedUserId: m.mentioned_user_id,
            createdAt: m.created_at,
            mentionedUser: mentionedUser ? {
              email: mentionedUser.email,
              fullName: mentionedUser.full_name,
              avatarUrl: mentionedUser.avatar_url,
            } : undefined
          }
        })
      }
    })

    const timeline: TimelineItem[] = [...activities, ...comments]
    timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // chronological

    return timeline
  }

  /**
   * Add a comment to a task and optionally process mentions.
   */
  static async addComment(
    taskId: string, 
    content: string, 
    mentionedUserIds: string[] = []
  ): Promise<TaskComment> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    // Insert comment
    const { data: comment, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        author_id: user.id,
        content
      })
      .select(`
        id, task_id, author_id, content, edited, created_at, updated_at,
        author:profiles!task_comments_author_id_fkey(email, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error adding comment:", error)
      throw new Error(error.message)
    }

    type MentionResult = {
      id: string; comment_id: string; mentioned_user_id: string; created_at: string;
      mentioned_user: { email: string; full_name: string | null; avatar_url: string | null } | { email: string; full_name: string | null; avatar_url: string | null }[] | null;
    };
    let createdMentions: MentionResult[] = []

    // Process mentions
    if (mentionedUserIds.length > 0) {
      const mentionsData = mentionedUserIds.map(userId => ({
        comment_id: comment.id,
        mentioned_user_id: userId
      }))

      const { data: mentionsRes, error: mentionsError } = await supabase
        .from("task_comment_mentions")
        .insert(mentionsData)
        .select(`
          id, comment_id, mentioned_user_id, created_at,
          mentioned_user:profiles!task_comment_mentions_mentioned_user_id_fkey(email, full_name, avatar_url)
        `)

      if (!mentionsError && mentionsRes) {
        createdMentions = mentionsRes
      }

      // Create notifications for mentioned users
      const { data: taskData } = await supabase
        .from("tasks")
        .select("title, project:projects(workspace_id)")
        .eq("id", taskId)
        .single()

      if (taskData) {
        const workspaceId = Array.isArray(taskData.project) ? taskData.project[0]?.workspace_id : (taskData.project as { workspace_id: string } | null)?.workspace_id
        
        const notificationsData = mentionedUserIds.map(userId => ({
          user_id: userId,
          workspace_id: workspaceId,
          title: "New Mention",
          message: `mentioned you in task "${taskData.title}"`,
          type: "mention",
          actor_id: user.id,
          task_id: taskId,
          comment_id: comment.id
        }))

        await supabase.from("notifications").insert(notificationsData)
      }
    }

    const commentAuthorData = Array.isArray(comment.author) ? comment.author[0] : comment.author

    return {
      id: comment.id,
      taskId: comment.task_id,
      authorId: comment.author_id,
      content: comment.content,
      edited: comment.edited,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: commentAuthorData ? {
        email: commentAuthorData.email,
        fullName: commentAuthorData.full_name,
        avatarUrl: commentAuthorData.avatar_url,
      } : undefined,
      mentions: createdMentions.map((m: MentionResult) => {
        const mentionedUserData = Array.isArray(m.mentioned_user) ? m.mentioned_user[0] : m.mentioned_user
        return {
          id: m.id,
          commentId: m.comment_id,
          mentionedUserId: m.mentioned_user_id,
          createdAt: m.created_at,
          mentionedUser: mentionedUserData ? {
            email: mentionedUserData.email,
            fullName: mentionedUserData.full_name,
            avatarUrl: mentionedUserData.avatar_url,
          } : undefined
        }
      })
    }
  }

  /**
   * Edit a comment
   */
  static async editComment(commentId: string, content: string): Promise<void> {
    const supabase = await createClient()
    
    // RLS will ensure only author can update
    const { error } = await supabase
      .from("task_comments")
      .update({
        content,
        edited: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", commentId)

    if (error) {
      console.error("Error editing comment:", error)
      throw new Error(error.message)
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string): Promise<void> {
    const supabase = await createClient()
    
    // RLS will ensure only author can delete
    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", commentId)

    if (error) {
      console.error("Error deleting comment:", error)
      throw new Error(error.message)
    }
  }
}
