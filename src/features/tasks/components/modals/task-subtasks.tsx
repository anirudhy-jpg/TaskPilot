"use client"

import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Plus, AlertCircle, AlertTriangle, Info, Pencil, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { TaskSubtask } from "@/features/project/types/project.types"
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types"
import { getSubtasks, addSubtask, updateSubtaskDetails, deleteSubtask } from "../../services/task-subtasks.service"
import { AssigneeSelector } from "../assignee-selector"
import { DeleteConfirmModal } from "@/features/project/components/modals/delete-confirm-modal"

interface TaskSubtasksProps {
  taskId: string
  members: WorkspaceMember[]
  projectPrefix: string
  parentTaskNumber: number
  onChange?: (subtasks: TaskSubtask[]) => void
}

const subtasksCache: Record<string, TaskSubtask[]> = {};

export function TaskSubtasks({ taskId, members, projectPrefix, parentTaskNumber, onChange }: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(subtasksCache[taskId] || [])
  const [isLoading, setIsLoading] = useState(!subtasksCache[taskId])
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [isOpen, setIsOpen] = useState(true)
  const [isComposing, setIsComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteSubtaskId, setDeleteSubtaskId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<{id: string, type: 'priority' | 'status', rect: DOMRect} | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchSubtasks = async () => {
      try {
        const data = await getSubtasks(taskId)
        subtasksCache[taskId] = data;
        if (mounted) {
          setSubtasks(data)
          onChange?.(data)
          setIsLoading(false)
        }
      } catch (e) {
        console.error("Error fetching subtasks:", e)
        if (mounted) setIsLoading(false)
      }
    }
    fetchSubtasks()

    const supabase = createClient()
    const channel = supabase
      .channel(`public:task_subtasks:${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_subtasks", filter: `task_id=eq.${taskId}` },
        () => {
          fetchSubtasks()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const handleAdd = async () => {
    if (!newTitle.trim() || isAdding) return
    setIsAdding(true)
    const titleToUse = newTitle.trim()
    setNewTitle("")

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const tempSubtask: TaskSubtask = {
      id: tempId,
      taskId,
      title: titleToUse,
      completed: false,
      status: "todo",
      priority: "medium",
      assigneeId: null,
      position: (subtasks.length > 0 ? Math.max(...subtasks.map(s => s.position)) : 0) + 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const newSubtasks = [...subtasks, tempSubtask]
    setSubtasks(newSubtasks)
    onChange?.(newSubtasks)

    try {
      const added = await addSubtask(taskId, titleToUse)
      setSubtasks(prev => prev.map(s => s.id === tempId ? {
        ...s,
        id: added.id,
        createdAt: added.created_at,
        updatedAt: added.updated_at,
      } : s))
      // We don't call onChange here to avoid setState during render if React batches this.
      // The realtime subscription will trigger a fresh fetch and call onChange anyway.
    } catch (e) {
      console.error(e)
      // Revert optimistic update on error
      setSubtasks(prev => prev.filter(s => s.id !== tempId))
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<TaskSubtask>) => {
    if (id.startsWith('temp-')) return

    // Optimistic
    const newSubtasks = subtasks.map(s => s.id === id ? { ...s, ...updates } : s)
    setSubtasks(newSubtasks)
    onChange?.(newSubtasks)
    try {
      await updateSubtaskDetails(id, updates)
    } catch (e) {
      console.error(e)
    }
  }

  const confirmDelete = async () => {
    if (!deleteSubtaskId) return
    
    if (deleteSubtaskId.startsWith('temp-')) {
      const newSubtasks = subtasks.filter(s => s.id !== deleteSubtaskId)
      setSubtasks(newSubtasks)
      onChange?.(newSubtasks)
      setDeleteSubtaskId(null)
      return
    }

    setIsDeleting(true)
    try {
      const newSubtasks = subtasks.filter(s => s.id !== deleteSubtaskId)
      setSubtasks(newSubtasks)
      onChange?.(newSubtasks)
      await deleteSubtask(deleteSubtaskId)
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeleting(false)
      setDeleteSubtaskId(null)
    }
  }

  const getPriorityUI = (priority: string) => {
    switch (priority) {
      case 'high': return { icon: <AlertCircle size={12} className="text-rose-400" />, label: 'H' }
      case 'medium': return { icon: <AlertTriangle size={12} className="text-amber-500" />, label: 'M' }
      case 'low': return { icon: <Info size={12} className="text-blue-400" />, label: 'L' }
      default: return { icon: <AlertTriangle size={12} className="text-amber-500" />, label: 'M' }
    }
  }

  const getStatusUI = (status: string) => {
    switch (status) {
      case 'todo': return { label: 'TO DO', classes: 'bg-slate-700 text-slate-200' }
      case 'in_progress': return { label: 'IN PROGRESS', classes: 'bg-blue-500 text-white' }
      case 'done': return { label: 'DONE', classes: 'bg-emerald-600 text-white' }
      default: return { label: 'TO DO', classes: 'bg-slate-700 text-slate-200' }
    }
  }

  const progress = subtasks.length > 0 
    ? Math.round((subtasks.filter(s => s.status === 'done' || s.completed).length / subtasks.length) * 100) 
    : 0

  if (isLoading) {
    return <div className="animate-pulse h-10 bg-slate-900 rounded-lg mt-4"></div>
  }

  return (
    <div className="flex flex-col gap-2 mt-4 select-none flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between text-slate-200 shrink-0">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown size={16} className={`transition-transform duration-200 text-slate-400 group-hover:text-slate-200 ${isOpen ? '' : '-rotate-90'}`} />
          <h3 className="font-bold text-[14px]">Subtasks</h3>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <button 
            className="p-1 hover:bg-slate-800 hover:text-slate-200 rounded transition-colors"
            onClick={() => {
              setIsOpen(true)
              setIsComposing(true)
              setNewTitle("")
              setTimeout(() => {
                const input = document.getElementById("new-subtask-input")
                if (input) input.focus()
              }, 50)
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-3 mt-1 animate-in fade-in slide-in-from-top-2 duration-200 flex-1 min-h-0">
          {/* Progress Bar Header */}
          {subtasks.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap">{progress}% Done</span>
            </div>
          )}

          {/* Table */}
          {(subtasks.length > 0 || isComposing) && (
          <div className="border border-slate-800 rounded-xl bg-slate-950/50 shadow-sm flex flex-col relative min-h-0 shrink">
            {/* Table Header */}
            {subtasks.length > 0 && (
              <div className="flex items-center border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 text-[11px] font-bold text-slate-400 rounded-t-xl shrink-0">
                <div className="flex-1">Work</div>
                <div className="w-[60px] pl-2 border-l border-slate-800/50">Priority</div>
                <div className="w-[60px] pl-2 border-l border-slate-800/50">Assignee</div>
                <div className="w-[110px] pl-2 border-l border-slate-800/50">Status</div>
              </div>
            )}

            {/* Table Body */}
            {subtasks.length > 0 ? (
              <div className="flex flex-col relative z-0 overflow-y-auto scrollbar-thin">
                {subtasks.map((task, i) => {
                  const priUI = getPriorityUI(task.priority || 'medium')
                  const statUI = getStatusUI(task.status || (task.completed ? 'done' : 'todo'))

                  const taskKey = `${projectPrefix}-${parentTaskNumber}.${i + 1}`

                  return (
                    <div key={task.id} className={`flex items-stretch border-b border-slate-800/50 last:border-0 hover:bg-slate-900/50 transition-colors group ${!isComposing ? 'last:rounded-b-xl' : ''} ${task.id.startsWith('temp-') ? 'opacity-50 pointer-events-none' : ''}`}>
                      {/* Work Column */}
                      <div className="flex-1 flex items-center gap-3 px-4 py-2.5 min-w-0">
                        <div className="text-blue-500 shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v18"/><path d="M18 3v18"/><path d="M3 15h18"/><path d="M3 9h18"/></svg>
                        </div>
                        <span className="text-[12px] font-medium text-blue-400 hover:underline cursor-pointer shrink-0">{taskKey}</span>
                        
                        {editingId === task.id ? (
                          <input 
                            ref={editInputRef}
                            type="text"
                            defaultValue={task.title}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== task.title) {
                                handleUpdate(task.id, { title: e.target.value.trim() })
                              }
                              setEditingId(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[12px] text-slate-200 outline-none focus:border-blue-500"
                          />
                        ) : (
                          <span 
                            className={`text-[12px] truncate flex-1 cursor-text ${task.status === 'done' || task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}
                            onClick={() => setEditingId(task.id)}
                          >
                            {task.title}
                          </span>
                        )}

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => setEditingId(task.id)} className="p-1 text-slate-500 hover:text-slate-300 rounded"><Pencil size={12} /></button>
                          <button onClick={() => setDeleteSubtaskId(task.id)} className="p-1 text-slate-500 hover:text-rose-400 rounded"><Trash2 size={12} /></button>
                        </div>
                      </div>

                      {/* Priority Column */}
                      <div 
                        className="w-[60px] flex items-center justify-center border-l border-slate-800/50 relative group/pri cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (activeDropdown?.id === task.id && activeDropdown.type === 'priority') {
                            setActiveDropdown(null)
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setActiveDropdown({ id: task.id, type: 'priority', rect })
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5 w-full justify-center text-[11px] font-medium text-slate-300 pointer-events-none group-hover/pri:bg-slate-800/50 h-full py-2.5 transition-colors">
                          {priUI.icon}
                          <span>{priUI.label}</span>
                        </div>
                      </div>

                      {/* Assignee Column */}
                      <div className="w-[60px] flex items-center justify-center border-l border-slate-800/50 relative z-0">
                        <AssigneeSelector
                          task={task}
                          members={members}
                          onChange={(id, assigneeId) => {
                            // Find member to optimistically update avatar
                            const member = members.find(m => m.userId === assigneeId)
                            const updates: Partial<TaskSubtask> = { assigneeId }
                            if (member && member.profile) {
                              updates.assignee = {
                                email: member.profile.email,
                                fullName: member.profile.fullName,
                                avatarUrl: member.profile.avatarUrl
                              }
                            } else if (!assigneeId) {
                              updates.assignee = undefined
                            }
                            handleUpdate(task.id, updates)
                          }}
                          size="small"
                        />
                      </div>

                      {/* Status Column */}
                      <div 
                        className="w-[110px] flex items-center px-2 py-2.5 border-l border-slate-800/50 relative group/stat hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (activeDropdown?.id === task.id && activeDropdown.type === 'status') {
                            setActiveDropdown(null)
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setActiveDropdown({ id: task.id, type: 'status', rect })
                          }
                        }}
                      >
                        <div className={`flex items-center justify-between w-full px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-black tracking-wide pointer-events-none ${statUI.classes}`}>
                          <span>{statUI.label}</span>
                          <ChevronDown size={10} className="opacity-70" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            {/* Add New Row */}
            {isComposing && (
              <div className={`flex items-stretch bg-slate-950/80 shrink-0 ${subtasks.length > 0 ? 'border-t border-slate-800/50 rounded-b-xl' : 'rounded-xl'}`}>
                <div className="flex-1 flex items-center gap-3 px-4 py-2 min-w-0">
                  <Plus size={14} className="text-slate-500 shrink-0" />
                  <input
                    id="new-subtask-input"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd()
                      if (e.key === 'Escape') setIsComposing(false)
                    }}
                    onBlur={() => {
                      if (!newTitle.trim()) setIsComposing(false)
                    }}
                    placeholder="What needs to be done?"
                    className="flex-1 bg-transparent text-[12px] text-slate-200 placeholder:text-slate-600 outline-none h-7"
                  />
                </div>
                {subtasks.length > 0 && (
                  <>
                    <div className="w-[60px] border-l border-slate-800/50"></div>
                    <div className="w-[60px] border-l border-slate-800/50"></div>
                    <div className="w-[110px] border-l border-slate-800/50"></div>
                  </>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!deleteSubtaskId}
        onClose={() => !isDeleting && setDeleteSubtaskId(null)}
        type="subtask"
        name={subtasks.find(s => s.id === deleteSubtaskId)?.title || "Subtask"}
        isPending={isDeleting}
        onConfirm={confirmDelete}
      />

      {activeDropdown && createPortal(
        <div 
          ref={dropdownRef} 
          className="fixed bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1"
          style={{
            top: activeDropdown.rect.bottom + 4,
            left: activeDropdown.type === 'priority' ? activeDropdown.rect.left - 26 : activeDropdown.rect.left - 16,
            width: activeDropdown.type === 'priority' ? '112px' : '144px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeDropdown.type === 'priority' && ['high', 'medium', 'low'].map(p => {
            const pUI = getPriorityUI(p)
            return (
              <button
                key={p}
                onClick={() => {
                  handleUpdate(activeDropdown.id, { priority: p as "low" | "medium" | "high" })
                  setActiveDropdown(null)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                {pUI.icon} <span className="capitalize">{p}</span>
              </button>
            )
          })}
          {activeDropdown.type === 'status' && ['todo', 'in_progress', 'done'].map(s => {
            const sUI = getStatusUI(s)
            return (
              <button
                key={s}
                onClick={() => {
                  handleUpdate(activeDropdown.id, { status: s, completed: s === 'done' })
                  setActiveDropdown(null)
                }}
                className="w-full flex items-center px-2 py-1.5 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className={`px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-black tracking-wide w-full text-left ${sUI.classes}`}>
                  {sUI.label}
                </div>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
