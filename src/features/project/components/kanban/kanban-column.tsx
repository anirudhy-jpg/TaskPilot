"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { SortableTaskCard } from "./sortable-task-card";
import type { KanbanColumnProps } from "./types";

/**
 * A single Kanban column that acts as a droppable container.
 * Uses SortableContext for within-column reordering.
 * Preserves the original column design from KanbanBoard.
 */
export const KanbanColumn = React.memo(
  function KanbanColumn({
    column,
    tasks,
    members,
    currentUserId,
    projectPrefix,
    taskNumberMap,
    onAddTask,
    onAssigneeChange,
    onSelectTask,
  }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
      id: `column-${column.id}`,
      data: {
        type: "column",
        columnId: column.id,
      },
    });

    const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks]);

    return (
      <div
        className={`rounded-3xl bg-white/40 backdrop-blur-md border p-5 flex flex-col gap-4 min-h-[600px] w-full relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[4px] before:${column.accentClass} shadow-xs transition-all duration-200 ${
          isOver
            ? "border-amber-500/40 bg-amber-50/30 ring-2 ring-amber-500/20"
            : "border-amber-900/5"
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between px-1.5 mb-1.5">
          <div className="flex items-center gap-2.5">
            {column.headerIcon}
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {column.title}
            </h3>
            {tasks.length > 0 && (
              <span
                className={`text-[10px] ${column.badgeBg} px-2 py-0.5 rounded-full font-black shadow-2xs`}
              >
                {tasks.length}
              </span>
            )}
          </div>
        </div>

        {/* Task Cards Stack — sortable container */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {/*
            Attach the droppable ref to the inner scrollable list (the actual
            drop area). Make it flex-grow so empty columns still present a
            sizable target for pointer collision detection.
          */}
          <div
            ref={setNodeRef}
            className="flex flex-col gap-3.5 overflow-y-auto flex-1 pr-1 scrollbar-thin min-h-[140px]"
          >
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                status={column.id}
                members={members}
                currentUserId={currentUserId}
                projectPrefix={projectPrefix}
                taskNumber={taskNumberMap.get(task.id)}
                onAssigneeChange={onAssigneeChange}
                onSelectTask={onSelectTask}
              />
            ))}

            {tasks.length === 0 && !isOver && (
              <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-amber-500/10 rounded-3xl bg-white/20 shadow-3xs p-4">
                <span className="text-xl mb-1.5 opacity-70">📥</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Empty Column
                </p>
                <p className="text-[9px] text-slate-400/90 mt-0.5">
                  No tasks in this stage
                </p>
              </div>
            )}

            {/* Drop indicator when hovering with an item over empty column */}
            {tasks.length === 0 && isOver && (
              <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-amber-500/30 rounded-3xl bg-amber-50/30 p-4 animate-pulse">
                <span className="text-xl mb-1.5">📌</span>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Drop here
                </p>
              </div>
            )}
          </div>
        </SortableContext>

        {/* Add Task Button at Bottom */}
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-slate-650 hover:text-amber-700 bg-white/60 hover:bg-white border border-amber-900/5 hover:border-amber-500/20 rounded-2xl text-xs font-extrabold shadow-3xs hover:shadow-2xs transition-all duration-250 cursor-pointer"
        >
          <Plus size={13} className="text-amber-600 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom check to see if tasks are identical
    if (prevProps.tasks.length !== nextProps.tasks.length) return false;
    for (let i = 0; i < prevProps.tasks.length; i++) {
      const pt = prevProps.tasks[i];
      const nt = nextProps.tasks[i];
      if (
        pt.id !== nt.id ||
        pt.status !== nt.status ||
        pt.position !== nt.position ||
        pt.title !== nt.title ||
        pt.assigneeId !== nt.assigneeId ||
        pt.priority !== nt.priority
      ) {
        return false;
      }
    }
    return (
      prevProps.column.id === nextProps.column.id &&
      prevProps.members.length === nextProps.members.length &&
      prevProps.currentUserId === nextProps.currentUserId &&
      prevProps.projectPrefix === nextProps.projectPrefix
    );
  }
);
