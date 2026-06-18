# Subtasks Feature Implementation

This document provides a deep, comprehensive breakdown of how the Task Subtasks feature was implemented in TaskPilot, from the database layer to the interactive, Jira-inspired frontend interface.

## 1. Overview

The subtasks feature enables users to break down larger tasks into smaller, manageable chunks. These subtasks live within a parent task and have their own distinct statuses, priorities, assignees, and titles. 

The primary goals of this implementation were:
- To provide a high-fidelity, interactive "table-like" UI within the task details modal.
- To ensure zero-latency user experiences through Optimistic UI updates.
- To maintain consistency across clients through Supabase Realtime synchronization.

---

## 2. Database Architecture

We created a new table called `task_subtasks` that maps directly to the parent `tasks` table via a foreign key with cascading deletes.

### Table Schema (`task_subtasks`)
```sql
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);
```

### Realtime Publication
To ensure all users looking at the same task see updates instantly, the table was added to the Supabase realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_subtasks;
```

---

## 3. Backend Services Layer

The backend logic is handled through Next.js Server Actions situated in `src/features/tasks/services/task-subtasks.service.ts`. This ensures secure, server-side data mutations using the Supabase admin client.

- **`getSubtasks(taskId)`**: Fetches all subtasks for a given task, joining with the `profiles` table to pull in assignee details (email, full name, avatar). Orders the results by `position` and `created_at`.
- **`addSubtask(taskId, title)`**: Inserts a new row with the default 'todo' status and 'medium' priority.
- **`updateSubtaskDetails(id, updates)`**: A dynamic update function accepting a `Partial<TaskSubtask>` to safely modify titles, priorities, statuses, and assignees.
- **`deleteSubtask(id)`**: Removes the subtask.

---

## 4. Frontend Architecture & UI

The core of the feature is the `<TaskSubtasks />` component (`src/features/tasks/components/modals/task-subtasks.tsx`). It features a highly interactive, custom-built table.

### Key UI Capabilities:
1. **Dynamic Progress Bar**: At the top of the subtasks list, a progress bar dynamically calculates completion percentages: `(completed / total) * 100`. It features smooth CSS transitions.
2. **Inline Editing**: Clicking on a subtask title swaps the text for an `<input>` field, allowing seamless renaming without modal popups. Pressing `Enter` or clicking away triggers an update.
3. **Portal-Rendered Dropdowns**: To avoid CSS `overflow: hidden` issues within the scrollable table area, the Priority and Status dropdowns are rendered using React's `createPortal()`. They calculate their position using `getBoundingClientRect()` relative to the clicked table cell.
4. **Assignee Selector Reuse**: We reused the existing `<AssigneeSelector />` component, adapting it to work inline within the subtask table row.
5. **Jira-style "Add New" Row**: When a user clicks the `+` button, an inline composition row appears at the bottom of the table.

---

## 5. Optimistic UI Updates

To ensure the application feels blazingly fast, all mutations (Add, Update, Delete) are handled optimistically. 

**Example Workflow (Adding a Subtask):**
1. The user presses `Enter` on the composition row.
2. A temporary subtask is immediately generated with a pseudo-ID (`temp-${Date.now()}`) and appended to local React state (`setSubtasks`).
3. The UI immediately reflects the new subtask.
4. The background network request (`addSubtask`) fires to the database.
5. If the request fails, the local state is rolled back. If it succeeds, the subsequent Realtime WebSocket event will cleanly replace the temporary subtask with the database-confirmed row.

This pattern is applied to Status changes, Priority changes, Assignee updates, and Deletions.

---

## 6. Realtime Synchronization

The component establishes a Supabase Realtime channel specifically scoped to the current `taskId`. 

```typescript
const channel = supabase
  .channel(`public:task_subtasks:${taskId}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "task_subtasks", filter: `task_id=eq.${taskId}` },
    () => {
      fetchSubtasks()
    }
  )
  .subscribe()
```
Whenever any user adds, edits, or deletes a subtask, this channel triggers a background refetch, instantly updating the UI for all other users viewing that same task detail modal.

---

## 7. Kanban Board Integration

To ensure visibility of subtask progress at a high level, the parent Kanban task cards (`src/features/kanbanboard/components/kanban/task-card.tsx`) were updated. 

If a task contains subtasks, a small badge indicator is rendered on the task card:
```tsx
<span className="...">
  {task.subtasks.filter(st => st.completed || st.status === 'done').length}/{task.subtasks.length}
</span>
```
This allows users to monitor subtask progress without having to open the task details modal.

---

## Conclusion

The subtask implementation is a prime example of building high-performance, complex micro-interactions in React. By combining Optimistic UI patterns with Supabase Realtime and intelligent CSS architectural decisions (like using portals for dropdowns), we delivered a premium, collaborative feature without sacrificing performance or UX.
