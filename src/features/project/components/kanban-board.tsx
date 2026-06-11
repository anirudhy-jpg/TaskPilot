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
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import {
  ListTodo,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { Project, Task, TaskStatus, TaskPriority } from "../types/project.types";
import type { WorkspaceMember } from "@/features/workspace/types/workspace.types";
import { TaskDetailsModal } from "./modals/task-details-modal";
import {
  KanbanColumn,
  TaskCard,
  groupTasksByColumn,
  computeDragResult,
  getColumnFromDropTarget,
} from "./kanban";
import type { KanbanColumnDef, TaskDragData } from "./kanban";
import { getProjectInitials, getVisualPriority } from "../utils/avatar";

interface KanbanBoardProps {
  project: Project & { tasks: Task[] };
  members: WorkspaceMember[];
  currentUserId?: string;
  onAddTask: (status: TaskStatus) => void;
  onDeleteTask: (id: string, title: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onTasksReorder?: (updates: { id: string; status: TaskStatus; position: number }[], draggedTaskId?: string) => void;
}

// ─── Column Definitions ─────────────────────────────────────

const COLUMN_DEFS: KanbanColumnDef[] = [
  {
    id: "todo",
    title: "To Do",
    accentClass: "bg-gradient-to-r before:from-blue-400 before:to-indigo-500",
    headerIcon: (
      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 shadow-3xs shrink-0">
        <ListTodo size={12} />
      </span>
    ),
    badgeBg: "bg-blue-50 text-blue-700 border border-blue-100/60",
  },
  {
    id: "in_progress",
    title: "In Progress",
    accentClass: "bg-gradient-to-r before:from-amber-400 before:to-orange-500",
    headerIcon: (
      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50 border border-amber-250/50 text-amber-600 shadow-3xs shrink-0">
        <Clock size={12} className="animate-spin-slow" />
      </span>
    ),
    badgeBg: "bg-amber-50 text-amber-700 border border-amber-250/60",
  },
  {
    id: "done",
    title: "Done",
    accentClass: "bg-gradient-to-r before:from-red-400 before:to-rose-500",
    headerIcon: (
      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-50 border border-rose-250/50 text-rose-600 shadow-3xs shrink-0">
        <CheckCircle2 size={12} />
      </span>
    ),
    badgeBg: "bg-rose-50 text-rose-700 border border-rose-250/60",
  },
];

// ─── Main KanbanBoard Component ─────────────────────────────

export function KanbanBoard({
  project,
  members,
  currentUserId,
  onAddTask,
  onAssigneeChange,
  onTasksReorder,
}: KanbanBoardProps) {
  
  const lastOverRef = useRef<Over | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Local task state for optimistic drag-and-drop updates
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);

  // Use local tasks during drag, otherwise project tasks
  const tasks = useMemo(() => localTasks ?? project.tasks ?? [], [localTasks, project.tasks]);

  // Snapshot for rollback on error
  const preDropSnapshot = useRef<Task[] | null>(null);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Group tasks into columns
  const tasksByColumn = useMemo(() => groupTasksByColumn(tasks), [tasks]);

  // Task numbering (by creation order, preserved from original)
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

    // If task count changed (add/delete), reset to server tasks
    if (project.tasks.length !== localTasks.length) {
      // Avoid synchronous setState inside effect — schedule reset on next tick
      setTimeout(() => setLocalTasks(null), 0);
      return;
    }

    const serverTaskMap = new Map(project.tasks.map((t) => [t.id, t]));

    // Check if the set of IDs matches
    const idMismatch = localTasks.some((t) => !serverTaskMap.has(t.id));
    if (idMismatch) {
      setTimeout(() => setLocalTasks(null), 0);
      return;
    }

    // Update fields in localTasks from server data (excluding status/position during drag)
    if (!localTasks) return;
    let changed = false;
    const updated = localTasks.map((localTask) => {
      const serverTask = serverTaskMap.get(localTask.id);
      if (!serverTask) return localTask;

      // Check if any visible field changed
      const titleChanged = localTask.title !== serverTask.title;
      const descChanged = localTask.description !== serverTask.description;
      const assigneeChanged = localTask.assigneeId !== serverTask.assigneeId ||
                              localTask.assignee?.email !== serverTask.assignee?.email;
      const priorityChanged = localTask.priority !== serverTask.priority;

      // Only sync status and position if not actively dragging
      const statusOrPosChanged = !activeTaskId && (
        localTask.status !== serverTask.status ||
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
          status: activeTaskId ? localTask.status : serverTask.status,
          position: activeTaskId ? localTask.position : serverTask.position,
        };
      }
      return localTask;
    });

    if (changed) {
      // schedule the update to avoid synchronous setState within the effect
      setTimeout(() => setLocalTasks(updated), 0);
    }
  }, [project.tasks, localTasks, activeTaskId]);

  // ─── DnD Collision Detection Strategy ───────────────────

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // 1. Try finding collision by checking if pointer is physically within a container
      const pointerCollisions = pointerWithin(args);
      let overId = getFirstCollision(pointerCollisions, "id");

      if (pointerCollisions.length > 0) {
        // Prefer a column container collision if one exists in the pointer results.
        // This avoids cases where a nested DOM node (RSC wrapper id, etc.) is
        // returned first and masks the actual column droppable.
        const columnCollision = pointerCollisions.find((c) =>
          String(c.id).startsWith("column-")
        );
        if (columnCollision) {
          overId = String(columnCollision.id);
        }

        if (overId != null) {
          // If the pointer is over a column container
          if (String(overId).startsWith("column-")) {
            const columnId = String(overId).replace("column-", "") as TaskStatus;
            const containerItems = tasksByColumn[columnId] || [];

            // If the column has items, find the closest task card in this column using closestCorners
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

          return pointerCollisions;
        }
      }

      // 2. If no pointer collision is found, fallback to closestCorners
      const fallback = closestCorners(args);

      // If the fallback collision doesn't point to a known task or column,
      // try to resolve the pointer location to a column droppable by checking
      // droppable container rects (helps with RSC wrapper ids or nested nodes).
      const firstFallback = getFirstCollision(fallback, "id");
      const isKnown = (() => {
        if (!firstFallback) return false;
        const idStr = String(firstFallback);
        if (idStr.startsWith("column-")) return true;
        // Check if id exists among task ids in any column
        for (const status of Object.keys(tasksByColumn) as TaskStatus[]) {
          if (tasksByColumn[status].some((t) => t.id === idStr)) return true;
        }
        return false;
      })();

      if (!isKnown && args.pointerCoordinates) {
        const { x, y } = args.pointerCoordinates;
        const columnContainer = args.droppableContainers.find((c) => {
          const idStr = String(c.id);
          if (!idStr.startsWith("column-")) return false;
          // c.rect may be a MutableRefObject<ClientRect|null> — use .current when present
          // or fall back to the value directly for compatibility.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rect = (c.rect as any)?.current ?? (c.rect as any);
          if (!rect) return false;
          return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        });

        if (columnContainer) {
          return [
            {
              id: columnContainer.id,
            } as unknown as Collision,
          ] as unknown as Collision[];
        }
        // Try to pick the nearest column droppable by pointer distance
        if (args.pointerCoordinates) {
          const { x, y } = args.pointerCoordinates;
          const columnRects = args.droppableContainers
            .filter((c) => String(c.id).startsWith("column-") && c.rect)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((c) => ({ id: String(c.id), rect: (c.rect as any)?.current ?? (c.rect as any) }));

          if (columnRects.length > 0) {
            const distances = columnRects.map((c) => {
              const rx = Math.max(c.rect.left, Math.min(x, c.rect.right));
              const ry = Math.max(c.rect.top, Math.min(y, c.rect.bottom));
              const dx = x - rx;
              const dy = y - ry;
              return { id: c.id, d: Math.sqrt(dx * dx + dy * dy) };
            });
            distances.sort((a, b) => a.d - b.d);
            const nearest = distances[0];
            if (nearest) {
              // Return nearest column container as a best-effort fallback
              return [
                {
                  id: nearest.id,
                } as unknown as Collision,
              ] as unknown as Collision[];
            }
          }
        }
      }

      return fallback;
    },
    [tasksByColumn]
  );

  // ─── DnD Sensors ─────────────────────────────────────────

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

  // ─── DnD Handlers ────────────────────────────────────────

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as TaskDragData | undefined;
      if (data?.type === "task") {
        setActiveTaskId(data.task.id);
        // Take a snapshot for possible rollback
        preDropSnapshot.current = [...tasks];
      }
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      if (active.id === over.id) return;

      const activeData = active.data.current as TaskDragData | undefined;
      if (!activeData || activeData.type !== "task") return;

      // Find active task's current column status from local state (or initial data)
      const activeTask = localTasks?.find((t) => t.id === String(active.id));
      const activeColumnId = activeTask ? activeTask.status : activeData.columnId;

      const overColumnId = getColumnFromDropTarget(over, tasksByColumn);
      // store last over so we can resolve at drag end if needed
      lastOverRef.current = over;
      if (!overColumnId) return;

      // Only update local tasks state in handleDragOver if crossing columns
      if (activeColumnId !== overColumnId) {
        setLocalTasks((prev) => {
          const current = prev ?? [...tasks];
          const currentGrouped = groupTasksByColumn(current);
          const result = computeDragResult(
            String(active.id),
            String(over.id),
            currentGrouped,
            current
          );
          return result ? result.updatedTasks : current;
        });
      }
    },
    [localTasks, tasks, tasksByColumn]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTaskId(null);

      // If the runtime `over` equals the active draggable (common when
      // pointer is not over any other droppable at drop time), prefer the
      // last recorded `over` from handleDragOver (if any) so we can
      // determine the intended target column.
      const effectiveOver = over && String(over.id) !== String(active.id) ? over : lastOverRef.current || over;

      const originalTasks = preDropSnapshot.current;
      preDropSnapshot.current = null;

      if (!effectiveOver || !originalTasks) {
        setLocalTasks(originalTasks);
        lastOverRef.current = null;
        return;
      }

      const originalMap = new Map(originalTasks.map((t) => [t.id, t]));
      const activeTaskOriginal = originalMap.get(String(active.id));
      if (!activeTaskOriginal) {
        setLocalTasks(null);
        return;
      }

      // Determine target column where drag ended
      const tempTasks = localTasks ?? originalTasks;
      const effectiveOverId = String(effectiveOver.id);
      const overColumnId = getColumnFromDropTarget(effectiveOver, groupTasksByColumn(tempTasks));
      // Debug: computed drag end target and column (no logging in prod)
      if (!overColumnId) {
        setLocalTasks(null);
        lastOverRef.current = null;
        return;
      }

      const sourceCol = activeTaskOriginal.status;
      const targetCol = overColumnId;

      // If localTasks is null, we use originalTasks (no cross-column movement took place yet)
      let currentTasks = localTasks ?? originalTasks;

      // Defensive fallback: if drag over wasn't registered but drag end is in a different column
      if (!localTasks && sourceCol !== targetCol) {
        const currentGrouped = groupTasksByColumn(originalTasks);
        const dragResult = computeDragResult(
          String(active.id),
          effectiveOverId,
          currentGrouped,
          originalTasks
        );
        if (dragResult) {
          currentTasks = dragResult.updatedTasks;
        }
      }

      let finalTasks = [...currentTasks];

      if (sourceCol === targetCol) {
        // Same-column reorder: calculate the new ordering using arrayMove
        const grouped = groupTasksByColumn(currentTasks);
        const columnTasks = [...grouped[sourceCol]];
        const oldIndex = columnTasks.findIndex((t) => t.id === String(active.id));
        let newIndex = columnTasks.findIndex((t) => t.id === effectiveOverId);
        if (newIndex === -1) {
          newIndex = columnTasks.length - 1;
        }

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex);
          const columnTaskIds = new Set(reordered.map((t) => t.id));
          finalTasks = currentTasks.map((task) => {
            if (columnTaskIds.has(task.id)) {
              const idx = reordered.findIndex((t) => t.id === task.id);
              return { ...task, position: idx };
            }
            return task;
          });
        }
      } else {
        // Cross-column move: position mapping check
        const grouped = groupTasksByColumn(currentTasks);
        finalTasks = currentTasks.map((task) => {
          const colTasks = grouped[task.status];
          const idx = colTasks.findIndex((t) => t.id === task.id);
          return { ...task, position: idx >= 0 ? idx : task.position };
        });
      }

      // Reset local tasks state immediately
      setLocalTasks(null);

      // Compare finalTasks with originalTasks to find all status/position changes
      const finalGrouped = groupTasksByColumn(finalTasks);
      const positionUpdates: { id: string; status: TaskStatus; position: number }[] = [];

      // Re-index source column
      finalGrouped[sourceCol].forEach((task, index) => {
        const orig = originalMap.get(task.id);
        if (!orig || orig.status !== task.status || orig.position !== index) {
          positionUpdates.push({ id: task.id, status: sourceCol, position: index });
        }
      });

      // Re-index target column (if cross-column)
      if (sourceCol !== targetCol) {
        finalGrouped[targetCol].forEach((task, index) => {
          const orig = originalMap.get(task.id);
          if (!orig || orig.status !== task.status || orig.position !== index) {
            positionUpdates.push({ id: task.id, status: targetCol, position: index });
          }
        });
      }

      if (positionUpdates.length > 0 && onTasksReorder) {
        onTasksReorder(positionUpdates, String(active.id));
      }
    },
    [localTasks, onTasksReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null);
    setLocalTasks(preDropSnapshot.current);
    preDropSnapshot.current = null;
  }, []);

  // Find the active task for drag overlay
  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasks.find((t) => t.id === activeTaskId) || null;
  }, [activeTaskId, tasks]);

  const activeTaskColumn = useMemo(() => {
    if (!activeTask) return null;
    return COLUMN_DEFS.find((c) => c.id === activeTask.status) || null;
  }, [activeTask]);

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        {COLUMN_DEFS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id]}
            members={members}
            currentUserId={currentUserId}
            projectPrefix={projectPrefix}
            taskNumberMap={taskNumberMap}
            onAddTask={onAddTask}
            onAssigneeChange={onAssigneeChange}
            onSelectTask={handleSelectTask}
          />
        ))}
      </div>

      {/* Drag Overlay — floating card that follows the cursor */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}>
        {activeTask && activeTaskColumn && (
          <TaskCard
            task={activeTask}
            status={activeTask.status}
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

      <TaskDetailsModal
        task={selectedTask}
        members={members}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        projectPrefix={projectPrefix}
        taskNumber={selectedTaskId ? taskNumberMap.get(selectedTaskId) : undefined}
        currentUserId={currentUserId}
        onAssigneeChange={onAssigneeChange}
      />
    </DndContext>
  );
}
