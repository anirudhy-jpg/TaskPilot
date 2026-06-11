"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./task-card";
import type { TaskCardProps, TaskDragData } from "./types";

/**
 * Wraps TaskCard with dnd-kit sortable behavior.
 * Handles drag handle, transform, and transition.
 *
 * Uses CSS.Translate instead of CSS.Transform to avoid
 * scale/skew jitter. Adds smooth transition for non-dragging items.
 */
export const SortableTaskCard = React.memo(
  function SortableTaskCard(props: TaskCardProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      isSorting,
    } = useSortable({
      id: props.task.id,
      data: {
        type: "task",
        task: props.task,
        columnId: props.status,
      } satisfies TaskDragData,
      // Smoother animation config
      transition: {
        duration: 200,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    });

    const style: React.CSSProperties = {
      // Use Translate (not Transform) to avoid layout jitter from scale
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.35 : 1,
      position: "relative" as const,
      zIndex: isDragging ? 50 : "auto",
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TaskCard {...props} disableHover={isSorting} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.position === nextProps.task.position &&
      prevProps.task.title === nextProps.task.title &&
      prevProps.task.description === nextProps.task.description &&
      prevProps.task.priority === nextProps.task.priority &&
      prevProps.task.assigneeId === nextProps.task.assigneeId &&
      prevProps.disableHover === nextProps.disableHover &&
      prevProps.taskNumber === nextProps.taskNumber &&
      prevProps.isDragOverlay === nextProps.isDragOverlay
    );
  }
);
