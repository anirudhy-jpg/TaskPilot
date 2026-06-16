"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  getFirstCollision,
  type Over,
  type Collision,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Circle, Clock, CheckCircle2 } from "lucide-react";
import type { Project, Task, Column, TaskPriority } from "@/features/project/types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { TaskDetailsModal } from "@/features/tasks/components/modals/task-details-modal";
import { KanbanColumn } from "./kanban/kanban-column";
import { TaskCard } from "./kanban/task-card";
import { groupTasksByColumn, getColumnFromDropTarget, computeFractionalPosition } from "./kanban/utils";
import type { KanbanColumnDef } from "./kanban/types";
import { getProjectInitials } from "@/features/project/utils/avatar";

interface KanbanBoardProps {
  project: Project & { tasks: Task[]; columns: Column[] };
  members: WorkspaceMember[];
  currentUserId?: string;
  onAddTask: (columnId: string) => void;
  onDeleteTask: (id: string, title: string) => void;
  onMoveTask: (taskId: string, columnId: string, position: number) => void;
  onCreateColumn: (name: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onMoveColumn: (columnId: string, position: number) => void;
  onDeleteColumn: (columnId: string, action: "move" | "delete", targetColumnId?: string) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onUpdateTask?: (taskId: string, updates: { title?: string; description?: string | null; priority?: TaskPriority }) => void;
}

export function KanbanBoard({
  project,
  members,
  currentUserId,
  onAddTask,
  onAssigneeChange,
  onMoveTask,
  onCreateColumn,
  onRenameColumn,
  onMoveColumn,
  onDeleteColumn,
  onDeleteTask,
  onUpdateTask,
}: KanbanBoardProps) {
  const lastOverRef = useRef<Over | null>(null);
  
  // Selected task detail modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Active dragging items
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  // Column deletion options state
  const [columnToDelete, setColumnToDelete] = useState<KanbanColumnDef | null>(null);
  const [deleteAction, setDeleteAction] = useState<"delete" | "move">("delete");
  const [targetColumnId, setTargetColumnId] = useState<string>("");

  // Local task state for optimistic drag-and-drop updates
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);

  // Use local tasks during drag, otherwise project tasks
  const tasks = useMemo(() => localTasks ?? project.tasks ?? [], [localTasks, project.tasks]);

  // Snapshot for rollback on error
  const preDropSnapshot = useRef<Task[] | null>(null);

  // Map database columns to Kanban Column definitions
  const columnDefs = useMemo<KanbanColumnDef[]>(() => {
    const cols = project.columns || [];
    const sortedCols = [...cols].sort((a, b) => a.position - b.position);
    return sortedCols.map((c, index) => {
      const accents = [
        "before:from-blue-400 before:to-indigo-500",
        "before:from-amber-400 before:to-orange-500",
        "before:from-emerald-400 before:to-teal-500",
        "before:from-purple-400 before:to-pink-500",
        "before:from-rose-400 before:to-rose-600",
      ];
      const badgeBgs = [
        "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      ];
      const icons = [
        <span key={c.id} className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-3xs shrink-0"><Circle size={11} /></span>,
        <span key={c.id} className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-3xs shrink-0"><Clock size={11} /></span>,
        <span key={c.id} className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-3xs shrink-0"><CheckCircle2 size={11} /></span>,
      ];
      const accentIndex = index % accents.length;
      const iconIndex = index % icons.length;

      return {
        id: c.id,
        title: c.name,
        accentClass: accents[accentIndex],
        headerIcon: icons[iconIndex],
        badgeBg: badgeBgs[accentIndex],
      };
    });
  }, [project.columns]);

  // Group tasks into columns
  const tasksByColumn = useMemo(() => {
    const colIds = columnDefs.map((c) => c.id);
    return groupTasksByColumn(tasks, colIds);
  }, [tasks, columnDefs]);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Task numbering (by creation order)
  const sortedTasks = useMemo(() => {
    return [...tasks].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [tasks]);

  const taskNumberMap = useMemo(() => {
    return new Map(sortedTasks.map((t, idx) => [t.id, idx + 1]));
  }, [sortedTasks]);

  const projectPrefix = useMemo(() => {
    return getProjectInitials(project.name);
  }, [project.name]);

  // Synchronize local tasks with server tasks when props change
  React.useEffect(() => {
    if (!localTasks) return;

    if (project.tasks.length !== localTasks.length) {
      setTimeout(() => setLocalTasks(null), 0);
      return;
    }

    const serverTaskMap = new Map(project.tasks.map((t) => [t.id, t]));
    const idMismatch = localTasks.some((t) => !serverTaskMap.has(t.id));
    if (idMismatch) {
      setTimeout(() => setLocalTasks(null), 0);
      return;
    }

    let changed = false;
    const updated = localTasks.map((localTask) => {
      const serverTask = serverTaskMap.get(localTask.id);
      if (!serverTask) return localTask;

      const titleChanged = localTask.title !== serverTask.title;
      const descChanged = localTask.description !== serverTask.description;
      const assigneeChanged = localTask.assigneeId !== serverTask.assigneeId ||
                              localTask.assignee?.email !== serverTask.assignee?.email;
      const priorityChanged = localTask.priority !== serverTask.priority;

      const statusOrPosChanged = !activeTaskId && (
        localTask.columnId !== serverTask.columnId ||
        localTask.position !== serverTask.position
      );

      if (titleChanged || descChanged || assigneeChanged || priorityChanged || statusOrPosChanged) {
        changed = true;
        return {
          ...localTask,
          title: serverTask.title,
          description: serverTask.description,
          assigneeId: serverTask.assigneeId,
          assignee: serverTask.assignee,
          priority: serverTask.priority,
          columnId: activeTaskId ? localTask.columnId : serverTask.columnId,
          status: activeTaskId ? localTask.columnId : serverTask.columnId,
          position: activeTaskId ? localTask.position : serverTask.position,
        };
      }
      return localTask;
    });

    if (changed) {
      setTimeout(() => setLocalTasks(updated), 0);
    }
  }, [project.tasks, localTasks, activeTaskId]);

  // Collision detection strategy supporting custom columns
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // If we are dragging a column, only consider column targets
      if (activeColumnId) {
        const columnContainers = args.droppableContainers.filter(c => String(c.id).startsWith("column-"));
        return closestCorners({ ...args, droppableContainers: columnContainers });
      }

      const pointerCollisions = pointerWithin(args);
      let overId = getFirstCollision(pointerCollisions, "id");

      if (pointerCollisions.length > 0) {
        const columnCollision = pointerCollisions.find((c) =>
          String(c.id).startsWith("column-")
        );
        if (columnCollision) {
          overId = String(columnCollision.id);
        }

        if (overId != null) {
          if (String(overId).startsWith("column-")) {
            const columnId = String(overId).replace("column-", "");
            const containerItems = tasksByColumn[columnId] || [];

            if (containerItems.length > 0) {
              const itemIds = new Set(containerItems.map((item) => item.id));
              const filteredContainers = args.droppableContainers.filter(
                (container) => itemIds.has(String(container.id))
              );

              const itemCollisions = closestCorners({
                ...args,
                droppableContainers: filteredContainers,
              });

              if (itemCollisions.length > 0) {
                return itemCollisions;
              }
            }
          }
        }
        return pointerCollisions;
      }

      const fallback = closestCorners(args);
      return fallback;
    },
    [tasksByColumn, activeColumnId]
  );

  // Drag Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag Handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (data?.type === "task") {
        setActiveTaskId(data.task.id);
        preDropSnapshot.current = [...tasks];
      } else if (data?.type === "column") {
        setActiveColumnId(data.columnId);
      }
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      if (active.id === over.id) return;

      const activeData = active.data.current;
      if (!activeData || activeData.type !== "task") return;

      const activeTask = localTasks?.find((t) => t.id === String(active.id)) || tasks.find((t) => t.id === String(active.id));
      if (!activeTask) return;

      const activeColumnId = activeTask.columnId;
      const overColumnId = getColumnFromDropTarget(over, tasksByColumn);
      lastOverRef.current = over;
      if (!overColumnId) return;

      if (activeColumnId !== overColumnId) {
        setLocalTasks((prev) => {
          const current = prev ?? [...tasks];
          return current.map((t) =>
            t.id === String(active.id) ? { ...t, columnId: overColumnId, status: overColumnId } : t
          );
        });
      }
    },
    [localTasks, tasks, tasksByColumn]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTaskId(null);
      setActiveColumnId(null);

      if (!over) {
        if (preDropSnapshot.current) {
          setLocalTasks(preDropSnapshot.current);
          preDropSnapshot.current = null;
        }
        return;
      }

      const activeData = active.data.current;

      // Column reorder logic
      if (activeData?.type === "column") {
        if (active.id !== over.id) {
          const sortedCols = [...project.columns].sort((a, b) => a.position - b.position);
          const activeIndex = sortedCols.findIndex((c) => c.id === activeData.columnId);
          const overColumnId = String(over.id).replace("column-", "");
          const overIndex = sortedCols.findIndex((c) => c.id === overColumnId);

          if (activeIndex !== -1 && overIndex !== -1) {
            let newPosition = 0.0;
            if (overIndex === 0) {
              newPosition = sortedCols[0].position / 2.0;
            } else if (overIndex === sortedCols.length - 1) {
              newPosition = sortedCols[sortedCols.length - 1].position + 1000.0;
            } else {
              const prevIdx = overIndex > activeIndex ? overIndex : overIndex - 1;
              const nextIdx = overIndex > activeIndex ? overIndex + 1 : overIndex;
              newPosition = (sortedCols[prevIdx].position + sortedCols[nextIdx].position) / 2.0;
            }
            onMoveColumn(activeData.columnId, newPosition);
          }
        }
        return;
      }

      // Tasks reorder logic
      const effectiveOver = over && String(over.id) !== String(active.id) ? over : lastOverRef.current || over;
      const originalTasks = preDropSnapshot.current;
      preDropSnapshot.current = null;

      if (!effectiveOver || !originalTasks) {
        setLocalTasks(originalTasks);
        lastOverRef.current = null;
        return;
      }

      const activeTaskOriginal = originalTasks.find((t) => t.id === String(active.id));
      if (!activeTaskOriginal) {
        setLocalTasks(null);
        return;
      }

      const tempTasks = localTasks ?? originalTasks;
      const overColumnId = getColumnFromDropTarget(effectiveOver, groupTasksByColumn(tempTasks, columnDefs.map(c => c.id)));
      if (!overColumnId) {
        setLocalTasks(null);
        lastOverRef.current = null;
        return;
      }

      // Compute fractional position
      const newPos = computeFractionalPosition(
        String(active.id),
        String(effectiveOver.id),
        activeTaskOriginal.columnId,
        overColumnId,
        groupTasksByColumn(tempTasks, columnDefs.map(c => c.id))
      );

      // Perform position and column assignment update
      onMoveTask(String(active.id), overColumnId, newPos);
      setLocalTasks(null);
      lastOverRef.current = null;
    },
    [project.columns, localTasks, tasks, columnDefs, onMoveColumn, onMoveTask]
  );

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null);
    setActiveColumnId(null);
    setLocalTasks(preDropSnapshot.current);
    preDropSnapshot.current = null;
  }, []);

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasks.find((t) => t.id === activeTaskId) || null;
  }, [activeTaskId, tasks]);

  const activeTaskColumn = useMemo(() => {
    if (!activeTask) return null;
    return columnDefs.find((c) => c.id === activeTask.columnId) || null;
  }, [activeTask, columnDefs]);
  const columnTasks = columnToDelete ? (tasksByColumn[columnToDelete.id] || []) : [];
  const hasTasks = columnTasks.length > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-row gap-6 items-start w-full overflow-x-auto sm:overflow-x-visible pb-4 lg:pb-0 scrollbar-none sm:scrollbar-thin">
        {/* Sortable column context */}
        <SortableContext items={columnDefs.map(c => `column-${c.id}`)} strategy={horizontalListSortingStrategy}>
          {columnDefs.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn[column.id] || []}
              members={members}
              currentUserId={currentUserId}
              projectPrefix={projectPrefix}
              taskNumberMap={taskNumberMap}
              onAddTask={onAddTask}
              onAssigneeChange={onAssigneeChange}
              onSelectTask={setSelectedTaskId}
              onRenameColumn={onRenameColumn}
              onDeleteColumn={(columnId) => {
                const col = columnDefs.find((c) => c.id === columnId);
                if (col) {
                  setColumnToDelete(col);
                  setDeleteAction("delete");
                  const firstTarget = columnDefs.find((c) => c.id !== columnId);
                  setTargetColumnId(firstTarget?.id || "");
                }
              }}
              allColumns={columnDefs}
            />
          ))}
        </SortableContext>
      </div>

      {/* Task Drag Overlay */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}>
        {activeTask && activeTaskColumn && (
          <TaskCard
            task={activeTask}
            status={activeTask.columnId}
            members={members}
            currentUserId={currentUserId}
            projectPrefix={projectPrefix}
            taskNumber={taskNumberMap.get(activeTask.id)}
            isDragOverlay
            onAssigneeChange={onAssigneeChange}
            onSelectTask={() => {}}
          />
        )}
      </DragOverlay>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        members={members}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        projectPrefix={projectPrefix}
        taskNumber={selectedTaskId ? taskNumberMap.get(selectedTaskId) : undefined}
        currentUserId={currentUserId}
        onAssigneeChange={onAssigneeChange}
        onStatusChange={(taskId, colId) => {
          const targetTasks = tasksByColumn[colId] || [];
          const nextPosition = (targetTasks[targetTasks.length - 1]?.position ?? 0) + 1000.0;
          onMoveTask(taskId, colId, nextPosition);
        }}
        onDeleteTask={onDeleteTask}
        columns={project.columns}
        onUpdateTask={onUpdateTask}
      />

      {columnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div>
              <h3 className="text-base font-extrabold text-slate-100">Delete Column</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Column name: {columnToDelete.title}
              </p>
            </div>

            {hasTasks ? (
              <>
                <p className="text-xs text-slate-400 leading-relaxed">
                  What would you like to do with the tasks currently assigned to this column?
                </p>

                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 hover:bg-slate-950/60 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deleteAction"
                      checked={deleteAction === "delete"}
                      onChange={() => setDeleteAction("delete")}
                      className="accent-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-205 text-slate-200">Delete all tasks</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Permanently delete all tasks inside this column.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 hover:bg-slate-950/60 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deleteAction"
                      checked={deleteAction === "move"}
                      onChange={() => {
                        setDeleteAction("move");
                        const firstTarget = columnDefs.find(c => c.id !== columnToDelete.id);
                        if (firstTarget) setTargetColumnId(firstTarget.id);
                      }}
                      className="accent-amber-500 focus:ring-amber-500"
                    />
                    <div className="w-full">
                      <p className="text-xs font-bold text-slate-205 text-slate-200">Move tasks to another column</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Keep tasks and transfer them to a selected column.</p>
                    </div>
                  </label>
                </div>

                {deleteAction === "move" && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Target Column</label>
                    <select
                      value={targetColumnId}
                      onChange={(e) => setTargetColumnId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/25 bg-slate-955 text-slate-200"
                    >
                      {columnDefs
                        .filter((c) => c.id !== columnToDelete.id)
                        .map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                            {c.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to delete this column? This action cannot be undone.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setColumnToDelete(null)}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteColumn(
                    columnToDelete.id,
                    hasTasks ? deleteAction : "delete",
                    hasTasks && deleteAction === "move" ? targetColumnId : undefined
                  );
                  setColumnToDelete(null);
                }}
                className="px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
              >
                Delete Column
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
