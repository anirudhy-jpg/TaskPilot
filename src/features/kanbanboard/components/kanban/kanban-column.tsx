"use client";

import React from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Edit2, Trash2, Check, GripVertical, MoreHorizontal } from "lucide-react";
import { SortableTaskCard } from "./sortable-task-card";
import type { KanbanColumnProps } from "./types";

/**
 * A single Kanban column that acts as a sortable/droppable container.
 * Supports inline renaming, grip-handle dragging, and safe deletion.
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
    onRenameColumn,
    onDeleteColumn,
    allColumns,
  }: KanbanColumnProps) {
    // Column sortable setup
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      isOver,
    } = useSortable({
      id: `column-${column.id}`,
      data: {
        type: "column",
        columnId: column.id,
      },
    });

    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
      opacity: isDragging ? 0.35 : undefined,
    };

    const [isEditing, setIsEditing] = React.useState(false);
    const [editedName, setEditedName] = React.useState(column.title);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setIsMenuOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isMenuOpen]);

    React.useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleSaveName = () => {
      if (editedName.trim() && editedName.trim() !== column.title) {
        onRenameColumn(column.id, editedName.trim());
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSaveName();
      if (e.key === "Escape") {
        setEditedName(column.title);
        setIsEditing(false);
      }
    };

    const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks]);

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-3xl bg-white/45 backdrop-blur-md border p-5 flex flex-col gap-4 h-[calc(100vh-240px)] min-h-[500px] max-h-[720px] w-[88vw] shrink-0 sm:w-full sm:flex-1 sm:shrink sm:min-w-[200px] sm:max-w-[320px] relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[4px] before:${column.accentClass} shadow-xs transition-all duration-200 ${
          isOver
            ? "border-amber-500/40 bg-amber-50/30 ring-2 ring-amber-500/20"
            : "border-amber-900/5"
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between px-1.5 mb-1.5 group/header">
          {isEditing ? (
            <div className="flex items-center gap-1.5 w-full mr-2">
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-0.5 text-xs font-bold border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
              <button onClick={handleSaveName} className="text-emerald-600 hover:text-emerald-700 cursor-pointer">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 w-full justify-between">
              <div 
                className="flex items-center gap-2.5 cursor-pointer max-w-[70%] overflow-hidden"
                onDoubleClick={() => setIsEditing(true)}
                title="Double click to rename"
              >
                {/* Grip Handle for dragging the column */}
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing text-slate-350 hover:text-slate-550 p-0.5 rounded transition-colors"
                >
                  <GripVertical size={14} />
                </div>
                {column.headerIcon}
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider truncate">
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

              {/* Column Actions Dropdown */}
              <div ref={menuRef} className="relative shrink-0 flex items-center">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Column Actions"
                >
                  <MoreHorizontal size={14} />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-1.5 top-6 w-36 bg-white border border-amber-900/10 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Edit2 size={13} />
                      Rename
                    </button>
                    {allColumns.length > 1 && (
                      <button
                        onClick={() => {
                          onDeleteColumn(column.id, "delete");
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-red-650 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Task Cards Stack — sortable container */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3.5 overflow-y-auto flex-1 pr-1 scrollbar-thin min-h-[140px]">
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
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-slate-655 hover:text-amber-700 bg-white/60 hover:bg-white border border-amber-900/5 hover:border-amber-500/20 rounded-2xl text-xs font-extrabold shadow-3xs hover:shadow-2xs transition-all duration-250 cursor-pointer"
        >
          <Plus size={13} className="text-amber-600 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>
    );
  },
  (prevProps, nextProps) => {
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
      prevProps.column.title === nextProps.column.title &&
      prevProps.allColumns.length === nextProps.allColumns.length &&
      prevProps.members.length === nextProps.members.length &&
      prevProps.currentUserId === nextProps.currentUserId &&
      prevProps.projectPrefix === nextProps.projectPrefix
    );
  }
);
