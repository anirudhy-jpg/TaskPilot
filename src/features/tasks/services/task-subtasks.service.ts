"use server"

import { createClient } from "@/lib/supabase/server"
import type { TaskSubtask } from "@/features/project/types/project.types"

export async function getSubtasks(taskId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_subtasks")
    .select(`
      *,
      assignee:profiles!task_subtasks_assignee_id_fkey(email, full_name, avatar_url)
    `)
    .eq("task_id", taskId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  
  // Transform snake_case to camelCase
  type SubtaskRow = {
    id: string; task_id: string; title: string; completed: boolean;
    status: string; priority: string | null; assignee_id: string | null;
    position: number; created_at: string; updated_at: string;
    assignee: { email: string; full_name: string | null; avatar_url: string | null } | null;
  };
  return data.map((item: SubtaskRow) => ({
    id: item.id,
    taskId: item.task_id,
    title: item.title,
    completed: item.completed,
    status: item.status,
    priority: item.priority,
    assigneeId: item.assignee_id,
    position: item.position,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    assignee: item.assignee ? {
      email: item.assignee.email,
      fullName: item.assignee.full_name,
      avatarUrl: item.assignee.avatar_url
    } : undefined
  })) as TaskSubtask[]
}

export async function addSubtask(taskId: string, title: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_subtasks")
    .insert({ task_id: taskId, title })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function toggleSubtask(subtaskId: string, completed: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("task_subtasks")
    .update({ 
      completed, 
      status: completed ? 'done' : 'todo',
      updated_at: new Date().toISOString() 
    })
    .eq("id", subtaskId)

  if (error) throw new Error(error.message)
}

export async function updateSubtaskDetails(subtaskId: string, updates: Partial<TaskSubtask>) {
  const supabase = await createClient()
  
  // Map camelCase to snake_case for DB
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status
    dbUpdates.completed = updates.status === 'done'
  }
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority
  if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId

  const { error } = await supabase
    .from("task_subtasks")
    .update(dbUpdates)
    .eq("id", subtaskId)

  if (error) throw new Error(error.message)
}

export async function deleteSubtask(subtaskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("task_subtasks")
    .delete()
    .eq("id", subtaskId)

  if (error) throw new Error(error.message)
}
