# TaskPilot — Kanban Board & Drag-and-Drop Implementation

This document provides a detailed technical guide to the Kanban board, its drag-and-drop (DND) mechanics, and the dynamic column customization system in TaskPilot. It outlines the libraries used, the exact state flow of working, the Supabase schema, RLS constraints, and how real-time synchronization is maintained.

---

## 1. Drag-and-Drop Architecture Overview

TaskPilot's Kanban board is built on top of **`@dnd-kit`** (`@dnd-kit/core` and `@dnd-kit/sortable`). This stack was chosen for its accessibility support, high performance, and flexibility in rendering drag animations using standard React concepts.

### Component Structure
* **`KanbanBoard.tsx`**: The main controller component. Houses the `<DndContext>`, handles active drag states for both tasks and columns, manages the optimistic React transition lifecycle, and coordinates the drag overlay.
* **`KanbanColumn.tsx`**: Individual column container (e.g., *To Do*, *In Progress*, *Done*). Registered as a droppable zone using `useDroppable` for tasks, while also acting as a sortable item for horizontal column drag-and-drop using `useSortable`.
* **`SortableTaskCard.tsx`**: Wrapper component for task cards that hooks into `useSortable`. It provides the drag attributes, listeners, and transform styles required by `@dnd-kit`.
* **`TaskCard.tsx`**: The raw presentation component for a task card, styling the task details, priority badge, and assignee avatar.
* **`utils.ts`**: Helper functions managing calculations, such as sorting task indices, grouping tasks, and re-indexing arrays during active moves.

---

## 2. Interactive Drag-and-Drop Flow of Working

The DND system utilizes a dual-state architecture:
1. **Local State (`localTasks` / `localColumns`)**: Provides instant, high-performance optimistic visual updates during the drag action and during the transition.
2. **Server State (`project.tasks` / `project.columns`)**: The source-of-truth server data. Persisted to Supabase PostgreSQL using Next.js Server Actions.

Here is the exact lifecycle of a drag operation:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Card as SortableTaskCard
    participant Board as KanbanBoard
    participant Utils as utils.ts
    participant DB as Supabase Database
  
    User->>Card: Start dragging card
    Card->>Board: Trigger onDragStart
    Board->>Board: Set activeTaskId & capture preDropSnapshot
    
    User->>Board: Drag card across columns
    loop During Drag
        Board->>Utils: collisionDetectionStrategy(args)
        Utils-->>Board: Return target under cursor (pointerWithin/closestCorners)
        Board->>Board: Trigger onDragOver
        opt Crossed Column Boundaries
            Board->>Utils: computeDragResult(activeId, overId)
            Utils-->>Board: Return reordered list of tasks
            Board->>Board: Set localTasks state (optimistic column shift)
        end
    end

    User->>Board: Release card (Drop)
    Board->>Board: Trigger onDragEnd & reset activeTaskId to null
    
    alt Dropped over task/column
        Board->>Utils: getColumnFromDropTarget(over)
        Utils-->>Board: Return target column ID
        Board->>Board: Calculate finalTasks list
        Board->>Board: startTransition(async)
        Note over Board: Optimistic parent state set via setOptimisticProjects
        Board->>DB: moveTaskAction(taskId, columnId, position)
        DB-->>Board: Return success: true
        Board->>Board: router.refresh() (revalidates Next.js layout cache)
    else Cancelled or Dropped outside
        Board->>Board: Rollback to preDropSnapshot
    end
    
    Board->>Board: Reset localTasks to null
```

---

## 3. Empty Column Collision Detection Strategy & Resolution

### Why the Bug Happened
* **Active Node Overlap on Drop**: At drop time, `dnd-kit` sometimes reports `event.over` equal to the dragged item's ID (especially when the pointer is slightly outside the intended drop target or due to nested RSC wrapper nodes). The code previously used that `over` directly, which caused the board to treat the drop as staying in the source column.
* **Mismatched Droppable Ref**: The droppable ref was on an outer wrapper while the visible drop area was the inner list.
* **Tiny/No Hitboxes**: Empty columns had tiny or non-existent hit areas, causing pointer collisions to miss them.

### How the Fix Works
* **Predictable Hitbox Placement**: Make the actual scrollable list the droppable node so it has a predictable, non-zero hitbox.
* **Pointer-First Proximity Hybrid**: Prefer column hits from `pointerWithin`; if ambiguous, map the pointer to a column's rect or choose the nearest column so empty columns are successfully detected.
* **Active Node Fallback**: When `over` equals the active item at drop, fall back to the last meaningful `over` observed while dragging so the system computes the correct target column and position.

### Implementation Code
Below is the custom collision detection strategy implemented in `KanbanBoard.tsx`:

```typescript
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // 1. Try finding collision by checking if pointer is physically within a container
      const pointerCollisions = pointerWithin(args);
      let overId = getFirstCollision(pointerCollisions, "id");

      if (overId != null) {
        // If the pointer is over a column container
        if (String(overId).startsWith("column-")) {
          const columnId = String(overId).replace("column-", "");
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

      // 2. If no pointer collision is found, fallback to closestCorners
      return closestCorners(args);
    },
    [tasksByColumn]
  );
```

---

## 4. Dynamic Column Customization (User-Defined Workflows)

TaskPilot allows project boards to be fully customized by adding, renaming, reordering, and deleting columns.

### 4.1. Database Schema
To support custom workflows, a new `columns` table was introduced and the `tasks` table was updated to reference it.

```sql
-- 1. Create columns table
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Modify tasks table to link to columns
ALTER TABLE tasks ADD COLUMN column_id UUID REFERENCES columns(id) ON DELETE CASCADE;
ALTER TABLE tasks ALTER COLUMN position TYPE DOUBLE PRECISION;
```

### 4.2. Fractional Indexing (Sorting)
Both tasks and columns use a `position` column typed as `DOUBLE PRECISION` (fractional indexing). This allows inserting or reordering items by computing a midpoint between neighboring elements:
$$Position_{new} = \frac{Position_{prev} + Position_{next}}{2.0}$$

This completely avoids re-indexing the entire list in the database on drag-and-drop operations, reducing execution cost to a single write.

### 4.3. Validation Rules
- **Column Limit**: A project is limited to a maximum of **5 columns** to maintain a clean layout and prevent horizontal layout degradation. Attempts to create a 6th column are rejected on both the client and server levels.

### 4.4. Column Seeding
When a project is created, the system seeds 3 default columns atomically:
1. **To Do** (`position: 1000.0`)
2. **In Progress** (`position: 2000.0`)
3. **Done** (`position: 3000.0`)

### 4.5. Atomic Column Deletion RPC
To prevent orphan tasks when a column is deleted, a PostgreSQL function handles clean cleanup:
```sql
CREATE OR REPLACE FUNCTION delete_column_and_handle_tasks(
  p_column_id UUID,
  p_action TEXT, -- 'move' or 'delete'
  p_target_column_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_max_pos DOUBLE PRECISION;
  v_rec RECORD;
  v_idx INT;
  v_board_id UUID;
BEGIN
  -- 1. Get the board_id of the column being deleted
  SELECT board_id INTO v_board_id FROM columns WHERE id = p_column_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Column not found';
  END IF;

  -- 2. Validate action
  IF p_action NOT IN ('move', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  -- 3. Handle tasks
  IF p_action = 'move' THEN
    IF p_target_column_id IS NULL THEN
      RAISE EXCEPTION 'Target column ID must be provided when moving tasks';
    END IF;

    -- Get max position from target column
    SELECT COALESCE(MAX(position), 0.0) INTO v_max_pos
    FROM tasks
    WHERE column_id = p_target_column_id;

    -- Update tasks in source column: set target column_id and update position
    v_idx := 1;
    FOR v_rec IN 
      SELECT id FROM tasks 
      WHERE column_id = p_column_id 
      ORDER BY position ASC
    LOOP
      UPDATE tasks
      SET column_id = p_target_column_id,
          position = v_max_pos + (v_idx * 1000.0)
      WHERE id = v_rec.id;
      
      v_idx := v_idx + 1;
    END LOOP;
  ELSIF p_action = 'delete' THEN
    -- Delete tasks belonging to this column
    DELETE FROM tasks WHERE column_id = p_column_id;
  END IF;

  -- 4. Delete the column itself
  DELETE FROM columns WHERE id = p_column_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

---

---

## 6. Realtime Board Synchronization

To keep multiple users working on the same board in sync, the drag-and-drop actions are paired with **Supabase Realtime** subscriptions.

* **Unified Subscription Channel**: Instead of subscribing to columns and tasks separately, the `use-board-realtime.ts` hook opens a single channel per board, listening to inserts, updates, and deletes for both the `columns` and `tasks` tables.
* **State Reconciliation**: When a real-time event fires, the hook merges the modifications into the local React state (recalculating task lists and columns dynamically).
* **Eviction Safety**: Realtime event hooks run RLS checks. If a user is evicted from a workspace in real-time, the database will fail policy checks and automatically block further real-time updates for that channel.
