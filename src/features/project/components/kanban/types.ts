import type {
  Task,
  TaskStatus,
} from "../../types/project.types";
import type {
  WorkspaceMember,
} from "@/features/workspace/types/workspace.types";

// ─── Column Definition ──────────────────────────────────────
export interface KanbanColumnDef {
  id: string; // Column UUID
  title: string;
  accentClass: string;
  headerIcon: React.ReactNode;
  badgeBg: string;
}

// ─── DnD item type discriminator ─────────────────────────────
export type DragItemType = "task" | "column";

// ─── DnD data attached to draggable items ────────────────────
export interface TaskDragData {
  type: "task";
  task: Task;
  columnId: string;
}

export interface ColumnDragData {
  type: "column";
  columnId: string;
  position: number;
}

// ─── Props shared across kanban components ───────────────────
export interface KanbanCallbacks {
  onAddTask: (columnId: string) => void;
  onDeleteTask: (id: string, title: string) => void;
  onMoveTask: (taskId: string, columnId: string, position: number) => void;
  onCreateColumn: (name: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onMoveColumn: (columnId: string, position: number) => void;
  onDeleteColumn: (columnId: string, action: "move" | "delete", targetColumnId?: string) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
}

export interface TaskCardProps {
  task: Task;
  status: string; // mapped columnId
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
  onAddTask: (columnId: string) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onSelectTask: (taskId: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string, action: "move" | "delete", targetColumnId?: string) => void;
  allColumns: KanbanColumnDef[];
}

