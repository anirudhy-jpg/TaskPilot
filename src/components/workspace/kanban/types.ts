import type { Task, TaskStatus, WorkspaceMember } from "@/types/workspace.types";

// ─── Column Definition ──────────────────────────────────────
export interface KanbanColumnDef {
  id: TaskStatus;
  title: string;
  accentClass: string;
  headerIcon: React.ReactNode;
  badgeBg: string;
}

// ─── DnD item type discriminator ─────────────────────────────
export type DragItemType = "task";

// ─── DnD data attached to draggable items ────────────────────
export interface TaskDragData {
  type: DragItemType;
  task: Task;
  columnId: TaskStatus;
}

// ─── Props shared across kanban components ───────────────────
export interface KanbanCallbacks {
  onAddTask: (status: TaskStatus) => void;
  onDeleteTask: (id: string, title: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
}

export interface TaskCardProps {
  task: Task;
  status: TaskStatus;
  members: WorkspaceMember[];
  currentUserId?: string;
  projectPrefix: string;
  taskNumber?: number;
  isDragOverlay?: boolean;
  disableHover?: boolean;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onSelectTask: (taskId: string) => void;
}

export interface KanbanColumnProps {
  column: KanbanColumnDef;
  tasks: Task[];
  members: WorkspaceMember[];
  currentUserId?: string;
  projectPrefix: string;
  taskNumberMap: Map<string, number>;
  onAddTask: (status: TaskStatus) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onSelectTask: (taskId: string) => void;
}
