# TaskPilot Time Tracking - Technical Architecture & Implementation

This document provides a deep, comprehensive breakdown of how the Time Tracking system is implemented in TaskPilot. It explains the data flow, the database structure, the state management strategy, and how all the UI components interact to provide a seamless, enterprise-grade experience without relying on heavy external dependencies.

---

## 1. The Database Architecture

The time tracking system is built around two primary entities in our PostgreSQL database:

### The `time_entries` Table
This is a brand new table dedicated to storing every block of tracked time. 
**Key Columns:**
- `id` (UUID): Unique identifier for the log.
- `task_id` (UUID): Links the time entry to a specific task. If the task is deleted, the time entries are cascade-deleted.
- `user_id` (UUID): Links the entry to the user who tracked the time.
- `start_time` (Timestamp): The exact moment the timer was started.
- `end_time` (Timestamp): The moment the timer was stopped. **If this is `NULL`, it means the timer is currently actively running.**
- `duration_seconds` (Integer): The total time tracked. Calculated automatically when the timer stops.
- `note` (Text): Optional description (used mostly for manual time entries).

### The `tasks` Table (Modified)
We added a new column to the existing tasks table:
- `estimated_minutes` (Integer): Stores the projected time a task should take. Defaults to `0`. This is used to calculate progress percentages on the UI.

---

## 2. Server Actions (The Backend Logic)

Since TaskPilot uses Next.js 15, all backend operations are handled securely via Server Actions. We do not use Row Level Security (RLS) in the database; instead, we validate workspace membership and user sessions directly inside these actions.

**Core Actions (`src/features/time-tracking/actions/`):**

1. **`startTimerAction(taskId)`**: 
   - First, it checks if the user currently has an active timer (any entry where `end_time` is NULL).
   - If they do, it instantly stops it (calculates the duration and sets the `end_time`). This enforces our **"Single Timer Rule"** — a user can only track one thing at a time.
   - Then, it creates a new row in `time_entries` for the new task with `end_time = NULL`.

2. **`stopTimerAction()`**:
   - Finds the user's active timer.
   - Calculates the difference between `start_time` and `now()`.
   - Updates the row, setting `end_time` to `now()` and saving the `duration_seconds`.

3. **`getActiveTimerAction()`**:
   - A simple query that looks for a row belonging to the user where `end_time` is NULL. Returns it so the UI knows a timer is running.

4. **`logManualTimeAction()`**:
   - Used when a user forgot to start a timer and wants to add time retroactively. It inserts a completed row immediately (calculating a past `start_time` based on the duration provided).

---

## 3. State Management (Event-Driven Reactivity)

To keep the bundle size small and performance lightning-fast, we **did not use heavy libraries like `@tanstack/react-query`**. Instead, we built a custom event-driven reactivity system using native React Hooks and Browser CustomEvents.

### How it works:
Whenever a Server Action modifies data (like starting a timer), it triggers a successful response to the frontend. The frontend then dispatches a global window event:
`window.dispatchEvent(new CustomEvent('refetch-active-timer'))`

### Custom Hooks (`src/features/time-tracking/hooks/use-time-tracking.ts`):
1. **`useActiveTimer`**: 
   - Listens to the `refetch-active-timer` event. When heard, it calls `getActiveTimerAction()` in the background and updates the React state.
   - **Polling:** It also features a lightweight `setInterval` that polls the server every 60 seconds. This ensures that if the user has TaskPilot open in multiple browser tabs, they all stay perfectly synchronized.

2. **`useTaskTimeEntries` & `useTaskTimeStats`**:
   - Fetch the list of historical logs and the aggregated statistics for a specific task. They listen to `refetch-task-entries` and `refetch-task-stats` events so the UI updates the exact millisecond a timer is stopped.

---

## 4. UI Components & UX

The user interface is broken down into specific, highly optimized components that consume the hooks mentioned above.

### `GlobalTimerWidget` (Located in the Header)
- This is the floating timer visible at the top of the screen no matter where you navigate.
- **Optimistic Ticking:** It uses `useActiveTimer` to get the `start_time` from the server. Once it has the start time, it uses a local JavaScript `setInterval` to tick the seconds up on the screen. This means the timer updates every second without making 60 API calls a minute.

### `TaskTimeStatistics` (The "Time Tracker" Tab in Task Details)
- This component houses the core tracking interface for a specific task.
- **The Layout:** `[Estimate Input Modal] -> [Start/Stop Timer Button] -> [Doughnut Pie Chart]`.
- **The Pie Chart:** Built entirely with CSS `conic-gradient`, making it extremely lightweight and performant without needing heavy charting libraries like D3 or Recharts. It calculates the percentage of `Tracked Time / Estimated Time`.
- **Estimate Modal:** Clicking the edit icon opens a modal matching the styling of the manual entry modal, ensuring UI consistency across the app.

### `TimeLogList` & `ManualTimeEntryModal`
- Lists all historical sessions for the task. It joins the data with the `profiles` table to show the avatar and name of the person who tracked the time.
- Allows users to retroactively add time using a sleek, focused modal, or delete erroneous logs.

## Summary of the Flow
1. User clicks **"Start Timer"**.
2. Component calls `startTimerAction()`.
3. Server stops any existing timers, creates a new entry, and returns success.
4. Component dispatches `refetch-active-timer`.
5. Both the `TaskTimeStatistics` and the `GlobalTimerWidget` instantly detect the event, fetch the new state, and the local JavaScript interval begins ticking the UI.
6. The pie chart progresses visually as the user tracks time.

---

## 5. Testing Strategy

The time tracking functionality is fully covered by automated tests using Vitest:
- **Server Action Tests:** All time tracking server actions are tested by mocking the underlying `TimeTrackingService`.
- **Validation:** Ensures actions return appropriate error objects (e.g., `success: false, error: '...'`) when the database operations fail or services throw.
- **Determinism:** Mocking the service layer ensures tests run in milliseconds without requiring an active PostgreSQL connection.
