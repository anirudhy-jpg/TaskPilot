import type { Task, TaskStatus } from "../../types/project.types";
import type { Active, Over } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { TaskDragData } from "./types";

/**
 * Grouped tasks by column status with position-based ordering.
 */
export type TasksByColumn = Record<TaskStatus, Task[]>;

/**
 * Groups tasks by status and sorts each group by position.
 */
export function groupTasksByColumn(tasks: Task[]): TasksByColumn {
  const grouped: TasksByColumn = {
    todo: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    const column = grouped[task.status];
    if (column) {
      column.push(task);
    }
  }

  // Sort each column by position ascending, with createdAt as tiebreaker
  for (const status of Object.keys(grouped) as TaskStatus[]) {
    grouped[status].sort((a, b) => {
      const posDiff = a.position - b.position;
      if (posDiff !== 0) return posDiff;
      // Fallback to creation time when positions tie (e.g. before migration backfill)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  return grouped;
}

/**
 * Extracts the column ID from a droppable or sortable item.
 * - If the item is a column droppable, the id is olumlike "cn-todo"
 * - If the item is a sortable task, the data has a columnId
 */
export function getColumnFromDropTarget(
  item: Active | Over | null,
  tasksByColumn: TasksByColumn
): TaskStatus | null {
  if (!item) return null;

  const id = String(item.id);

  // Check if it's a column droppable
  if (id.startsWith("column-")) {
    return id.replace("column-", "") as TaskStatus;
  }

  // Check if it's a task — find which column it's in
  const data = item.data?.current as TaskDragData | undefined;
  if (data?.type === "task") {
    return data.columnId;
  }

  // Fallback: search all columns for this task ID
  for (const status of Object.keys(tasksByColumn) as TaskStatus[]) {
    if (tasksByColumn[status].some((t) => t.id === id)) {
      return status;
    }
  }

  return null;
}

/**
 * Result of computing the drag-and-drop outcome.
 */
export interface DragResult {
  /** Updated full task list after the reorder */
  updatedTasks: Task[];
  /** Position updates that need to be persisted to the database */
  positionUpdates: { id: string; status: TaskStatus; position: number }[];
}

/**
 * Computes the new task state after a drag operation.
 * Handles both same-column reorder and cross-column moves.
 */
export function computeDragResult(
  activeId: string,
  overId: string,
  tasksByColumn: TasksByColumn,
  allTasks: Task[]
): DragResult | null {
  const activeColumnId = findTaskColumn(activeId, tasksByColumn);
  let overColumnId = findTaskColumn(overId, tasksByColumn);

  // If overId is a column droppable id
  if (!overColumnId && overId.startsWith("column-")) {
    overColumnId = overId.replace("column-", "") as TaskStatus;
  }

  if (!activeColumnId || !overColumnId) return null;

  if (activeColumnId === overColumnId) {
    // Same-column reorder
    return computeSameColumnReorder(
      activeId,
      overId,
      activeColumnId,
      tasksByColumn,
      allTasks
    );
  } else {
    // Cross-column move
    return computeCrossColumnMove(
      activeId,
      overId,
      activeColumnId,
      overColumnId,
      tasksByColumn,
      allTasks
    );
  }
}

function findTaskColumn(
  taskId: string,
  tasksByColumn: TasksByColumn
): TaskStatus | null {
  for (const status of Object.keys(tasksByColumn) as TaskStatus[]) {
    if (tasksByColumn[status].some((t) => t.id === taskId)) {
      return status;
    }
  }
  return null;
}

/**
 * Same-column reorder using arrayMove.
 */
function computeSameColumnReorder(
  activeId: string,
  overId: string,
  columnId: TaskStatus,
  tasksByColumn: TasksByColumn,
  allTasks: Task[]
): DragResult {
  const column = [...tasksByColumn[columnId]];
  const oldIndex = column.findIndex((t) => t.id === activeId);
  const newIndex = column.findIndex((t) => t.id === overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return { updatedTasks: allTasks, positionUpdates: [] };
  }

  const reordered = arrayMove(column, oldIndex, newIndex);

  // Reindex positions
  const positionUpdates: DragResult["positionUpdates"] = [];
  const updatedColumn = reordered.map((task, index) => {
    const updated = { ...task, position: index };
    positionUpdates.push({ id: task.id, status: columnId, position: index });
    return updated;
  });

  // Rebuild full task array
  const columnTaskIds = new Set(updatedColumn.map((t) => t.id));
  const updatedTasks = allTasks.map((task) => {
    if (columnTaskIds.has(task.id)) {
      return updatedColumn.find((t) => t.id === task.id)!;
    }
    return task;
  });

  return { updatedTasks, positionUpdates };
}

/**
 * Cross-column move: removes from source, inserts into target.
 */
function computeCrossColumnMove(
  activeId: string,
  overId: string,
  sourceColumnId: TaskStatus,
  targetColumnId: TaskStatus,
  tasksByColumn: TasksByColumn,
  allTasks: Task[]
): DragResult {
  const sourceColumn = [...tasksByColumn[sourceColumnId]];
  const targetColumn = [...tasksByColumn[targetColumnId]];

  const activeIndex = sourceColumn.findIndex((t) => t.id === activeId);
  if (activeIndex === -1) {
    return { updatedTasks: allTasks, positionUpdates: [] };
  }

  const activeTask = sourceColumn[activeIndex];

  // Remove from source
  sourceColumn.splice(activeIndex, 1);

  // Find insertion index in target
  let insertIndex = targetColumn.findIndex((t) => t.id === overId);
  if (insertIndex === -1) {
    // Drop on empty column or column droppable — place at end
    insertIndex = targetColumn.length;
  }

  // Insert into target with updated status
  const movedTask = { ...activeTask, status: targetColumnId };
  targetColumn.splice(insertIndex, 0, movedTask);

  // Reindex positions for both columns
  const positionUpdates: DragResult["positionUpdates"] = [];

  const updatedSource = sourceColumn.map((task, index) => {
    const updated = { ...task, position: index };
    positionUpdates.push({ id: task.id, status: sourceColumnId, position: index });
    return updated;
  });

  const updatedTarget = targetColumn.map((task, index) => {
    const updated = { ...task, position: index };
    positionUpdates.push({ id: task.id, status: targetColumnId, position: index });
    return updated;
  });

  // Build a lookup of all updated tasks
  const updatedMap = new Map<string, Task>();
  for (const t of updatedSource) updatedMap.set(t.id, t);
  for (const t of updatedTarget) updatedMap.set(t.id, t);

  // Rebuild full task array preserving tasks from other columns
  const updatedTasks = allTasks.map((task) => {
    return updatedMap.get(task.id) || task;
  });

  return { updatedTasks, positionUpdates };
}
