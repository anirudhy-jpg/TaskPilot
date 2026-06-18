import type { Task } from "@/features/project/types/project.types";
import type { Active, Over } from "@dnd-kit/core";
import type { TaskDragData } from "./types";

/**
 * Grouped tasks by column status/id with position-based ordering.
 */
export type TasksByColumn = Record<string, Task[]>;

/**
 * Groups tasks by columnId/status and sorts each group by position.
 */
export function groupTasksByColumn(tasks: Task[], columnIds: string[]): TasksByColumn {
  const grouped: TasksByColumn = {};
  for (const id of columnIds) {
    grouped[id] = [];
  }

  for (const task of tasks) {
    // Fallback to task.status if columnId is missing/legacy
    const colId = task.columnId || task.status;
    if (colId && grouped[colId]) {
      grouped[colId].push(task);
    } else if (columnIds.length > 0) {
      // Fallback: put in the first column
      grouped[columnIds[0]].push(task);
    }
  }

  // Sort each column by position ascending
  for (const id of columnIds) {
    grouped[id].sort((a, b) => {
      const posDiff = a.position - b.position;
      if (posDiff !== 0) return posDiff;
      // Fallback to creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  return grouped;
}

/**
 * Extracts the column ID from a droppable or sortable item.
 */
export function getColumnFromDropTarget(
  item: Active | Over | null,
  tasksByColumn: TasksByColumn
): string | null {
  if (!item) return null;

  const id = String(item.id);

  // Check if it's a column droppable
  if (id.startsWith("column-")) {
    return id.replace("column-", "");
  }

  // Check if it's a task — find which column it's in
  const data = item.data?.current as TaskDragData | undefined;
  if (data?.type === "task") {
    return data.columnId;
  }

  // Fallback: search all columns for this task ID
  for (const colId of Object.keys(tasksByColumn)) {
    if (tasksByColumn[colId].some((t) => t.id === id)) {
      return colId;
    }
  }

  return null;
}

/**
 * Calculates a new fractional position for a task dropped in a column.
 * Handles same-column reorder and cross-column moves.
 */
export function computeFractionalPosition(
  activeId: string,
  overId: string,
  activeColumnId: string,
  overColumnId: string,
  tasksByColumn: TasksByColumn
): number {
  const targetColumn = [...(tasksByColumn[overColumnId] || [])];
  
  // If active task was in the same column, remove it from list to avoid incorrect index math
  const activeIdx = targetColumn.findIndex((t) => t.id === activeId);
  if (activeIdx !== -1) {
    targetColumn.splice(activeIdx, 1);
  }

  if (targetColumn.length === 0) {
    return 1000.0;
  }

  // If dropped directly on the column droppable target (empty area)
  if (overId.startsWith("column-")) {
    const lastTask = targetColumn[targetColumn.length - 1];
    return lastTask.position + 1000.0;
  }

  // Find index of the task we are dropping over
  const overIdx = targetColumn.findIndex((t) => t.id === overId);
  if (overIdx === -1) {
    const lastTask = targetColumn[targetColumn.length - 1];
    return lastTask.position + 1000.0;
  }

  // Check if dropping at the beginning, end, or middle
  if (overIdx === 0) {
    const firstTask = targetColumn[0];
    return firstTask.position / 2.0;
  }

  // Dropped in between overIdx - 1 and overIdx
  const prevTask = targetColumn[overIdx - 1];
  const nextTask = targetColumn[overIdx];
  return (prevTask.position + nextTask.position) / 2.0;
}
