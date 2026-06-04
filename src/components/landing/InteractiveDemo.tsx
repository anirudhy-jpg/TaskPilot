"use client"

import React, { useState } from "react"
import { Plus, ArrowRight, ArrowLeft, Trash2, Sparkles, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DemoTask {
  id: string
  title: string
  category: "Design" | "Bug" | "Feature" | "DevOps"
  priority: "High" | "Medium" | "Low"
}

interface Column {
  id: "todo" | "progress" | "done"
  title: string
  tasks: DemoTask[]
  color: string
}

export function InteractiveDemo() {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: "todo",
      title: "To Do",
      color: "border-t-indigo-500",
      tasks: [
        { id: "1", title: "Add profile picture upload", category: "Feature", priority: "Medium" },
        { id: "2", title: "Fix API token caching leak", category: "Bug", priority: "High" },
        { id: "3", title: "Write technical system spec", category: "Design", priority: "Low" },
      ],
    },
    {
      id: "progress",
      title: "In Progress",
      color: "border-t-violet-500",
      tasks: [
        { id: "4", title: "Refactor database migrations", category: "DevOps", priority: "High" },
        { id: "5", title: "Stripe billing integration", category: "Feature", priority: "Medium" },
      ],
    },
    {
      id: "done",
      title: "Done",
      color: "border-t-emerald-500",
      tasks: [
        { id: "6", title: "Deploy initial Supabase schema", category: "DevOps", priority: "High" },
      ],
    },
  ])

  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState<"Design" | "Bug" | "Feature" | "DevOps">("Feature")
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium")

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const task: DemoTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      category: newTaskCategory,
      priority: newTaskPriority,
    }

    setColumns(
      columns.map((col) => {
        if (col.id === "todo") {
          return { ...col, tasks: [...col.tasks, task] }
        }
        return col
      })
    )
    setNewTaskTitle("")
  }

  const moveTask = (taskId: string, currentColId: "todo" | "progress" | "done", direction: "forward" | "backward") => {
    let taskToMove: DemoTask | null = null

    // Extract the task
    const updatedColumns = columns.map((col) => {
      if (col.id === currentColId) {
        taskToMove = col.tasks.find((t) => t.id === taskId) || null
        return {
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }
      }
      return col
    })

    if (!taskToMove) return

    // Calculate destination
    let destColId: "todo" | "progress" | "done" = currentColId
    if (currentColId === "todo" && direction === "forward") destColId = "progress"
    else if (currentColId === "progress") {
      destColId = direction === "forward" ? "done" : "todo"
    } else if (currentColId === "done" && direction === "backward") destColId = "progress"

    // Insert task
    setColumns(
      updatedColumns.map((col) => {
        if (col.id === destColId) {
          return { ...col, tasks: [...col.tasks, taskToMove!] }
        }
        return col
      })
    )
  }

  const deleteTask = (taskId: string, currentColId: "todo" | "progress" | "done") => {
    setColumns(
      columns.map((col) => {
        if (col.id === currentColId) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          }
        }
        return col
      })
    )
  }

  const getPriorityColor = (prio: "High" | "Medium" | "Low") => {
    switch (prio) {
      case "High":
        return "bg-red-500/10 text-red-400 border-red-500/20"
      case "Medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      case "Low":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    }
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Feature":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
      case "Bug":
        return "bg-pink-500/10 text-pink-400 border-pink-500/20"
      case "Design":
        return "bg-violet-500/10 text-violet-400 border-violet-500/20"
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    }
  }

  return (
    <section id="demo" className="py-24 bg-[#0b0f19] relative overflow-hidden border-t border-white/5">
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive Playground</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Try TaskPilot Right Now
          </h2>
          <p className="text-base text-slate-400 mt-4">
            Experience the fluid interactions of our workspace boards. Create tasks, update status, and test the layout controls below.
          </p>
        </div>

        {/* Creator Control & Board Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Creator Form */}
          <div className="lg:col-span-4 bg-slate-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-indigo-400" />
              Add Custom Task
            </h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Task Title</label>
                <Input
                  type="text"
                  placeholder="e.g. Write signup page tests"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 rounded-xl h-10 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e: any) => setNewTaskCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 h-10 cursor-pointer"
                  >
                    <option value="Feature">Feature</option>
                    <option value="Bug">Bug</option>
                    <option value="Design">Design</option>
                    <option value="DevOps">DevOps</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 h-10 cursor-pointer"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 border-0 mt-2 h-10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add to To Do Column
              </Button>
            </form>
          </div>

          {/* Simulated Kanban Board */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/40 border border-white/5 rounded-3xl p-5 md:p-6 backdrop-blur-sm min-h-[450px]">
            {columns.map((col) => (
              <div
                key={col.id}
                className="flex flex-col gap-4 bg-slate-900/30 rounded-2xl border border-white/[0.03] p-4 min-h-[350px] relative overflow-hidden"
              >
                {/* Column Top Accent */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${col.id === 'todo' ? 'from-indigo-500' : col.id === 'progress' ? 'from-violet-500' : 'from-emerald-500'} to-transparent`} />

                {/* Column Header */}
                <div className="flex items-center justify-between text-sm font-semibold text-slate-300 mt-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.id === 'todo' ? 'bg-indigo-500' : col.id === 'progress' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                    <span>{col.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-slate-500">
                    {col.tasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1">
                  {col.tasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-600">No tasks here</p>
                    </div>
                  ) : (
                    col.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-[#0e1322] border border-white/5 rounded-xl p-4 space-y-3 group shadow-sm hover:border-white/10 hover:shadow-md transition-all duration-200 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {/* Task Title */}
                        <div className="text-sm font-semibold text-white leading-tight">
                          {task.title}
                        </div>

                        {/* Task Metadata */}
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${getCategoryColor(task.category)} font-medium`}>
                            {task.category}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${getPriorityColor(task.priority)} font-medium`}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Action Panel */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                          {/* Trash button */}
                          <button
                            onClick={() => deleteTask(task.id, col.id)}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Navigation buttons */}
                          <div className="flex gap-1.5">
                            {col.id !== "todo" && (
                              <button
                                onClick={() => moveTask(task.id, col.id, "backward")}
                                className="text-slate-500 hover:text-white bg-slate-950 p-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-all active:scale-95"
                                title="Move left"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.id !== "done" && (
                              <button
                                onClick={() => moveTask(task.id, col.id, "forward")}
                                className="text-slate-500 hover:text-white bg-slate-950 p-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-all active:scale-95"
                                title="Move right"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
