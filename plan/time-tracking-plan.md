# Implement Enterprise Time Tracking System for TaskPilot

This implementation plan details the steps and architecture required to build a complete production-ready Time Tracking feature, similar to Jira or ClickUp, using Next.js 15, TypeScript, Supabase, Server Actions, React Query, and TailwindCSS. 

**Note: Row Level Security (RLS) is disabled for this project.** All permission checks will be handled at the application level within Server Actions.

## User Review Required

> [!WARNING]
> We will need to alter the existing `tasks` table to include the `estimated_minutes` column, and create a new `time_entries` table. Please confirm if you would like me to generate the SQL migration script for you to run, or if you will handle the database changes directly in the Supabase Dashboard.

## Open Questions

> [!IMPORTANT]
> 1. For the Global Timer Widget in the Navbar, should we use Supabase Realtime subscriptions to listen for `time_entries` changes, or is a polling strategy / optimistic React Query update sufficient?
> 2. How should we handle overlapping manual time entries? Should the system allow a user to log manual time that overlaps with an already recorded session, or should we strictly validate and prevent overlaps?

## Proposed Changes

---

### Database Schema

#### [MODIFY] `tasks` table
- Add column: `estimated_minutes integer default 0`

#### [NEW] `time_entries` table
- Columns: 
  - `id` (uuid, primary key)
  - `task_id` (uuid, references `tasks(id)` on delete cascade)
  - `user_id` (uuid, references `profiles(id)`)
  - `start_time` (timestamptz, not null)
  - `end_time` (timestamptz)
  - `duration_seconds` (integer)
  - `note` (text)
  - `created_at` (timestamptz, default now())
- Indexes: `idx_time_entries_task` on `task_id`, `idx_time_entries_user` on `user_id`.
- *Note: RLS is NOT used. Server actions will validate workspace membership and roles before allowing insert/update/delete operations.*

---

### Features: Time Tracking (Types, Hooks, Actions, Components)

#### [NEW] `src/features/time-tracking/types/index.ts`
- Define `TimeEntry` interface.
- Define `TaskTimeStats` interface.
- Define `ProjectTimeStats` interface.

#### [NEW] `src/features/time-tracking/actions/`
- `start-timer.ts`: Stops any active timer for the user, starts a new timer for the given task.
- `stop-timer.ts`: Updates `end_time` and `duration_seconds` for the active timer.
- `get-active-timer.ts`: Fetches the timer where `end_time is null` for the current user.
- `get-task-time-entries.ts`: Fetches all logs for a specific task.
- `log-manual-time.ts`: Creates a completed time entry.
- `update-time-entry.ts` / `delete-time-entry.ts`: Edits/removes existing logs. Validates creator or Workspace Admin role.
- `get-project-time-stats.ts`: Aggregates team analytics and total project time.
- `get-user-time-stats.ts`: Aggregates "My Time" for the dashboard.

#### [NEW] `src/features/time-tracking/hooks/`
- `useActiveTimer.ts`: Polls or listens for the active timer state.
- `useTaskTimeEntries.ts`: Fetches and caches logs for a task.
- `useStartTimer.ts`, `useStopTimer.ts`: Mutations for timer control with optimistic updates.
- `useCreateManualEntry.ts`, `useUpdateTimeEntry.ts`, `useDeleteTimeEntry.ts`: Mutations for manual logs.

#### [NEW] `src/features/time-tracking/components/`
- `GlobalTimerWidget.tsx`: The navbar widget displaying active tracked time. Updates every second locally.
- `TaskTimerControls.tsx`: The "Start Timer" / "Stop Timer" button in the task modal.
- `ActiveTimerModal.tsx`: The confirmation modal asking to switch timers if one is already running.
- `TimeLogList.tsx`: Displays the list of time entries (Today, Yesterday, etc.) with edit/delete actions.
- `ManualTimeEntryModal.tsx`: Form to log time manually.
- `TaskTimeStatistics.tsx`: Displays Estimated vs Tracked visually (progress bars, over-estimate warnings).
- `ProjectTimeDashboard.tsx`: Displays aggregated project statistics and Team Analytics.

#### [NEW] `src/features/time-tracking/utils/time-format.ts`
- Helpers to convert seconds to `2h 15m` format, and parse `2d 4h` into minutes/seconds.

---

### Integration: Existing Features

#### [MODIFY] `src/features/tasks/components/modals/task-details-modal.tsx`
- Integrate `TaskTimerControls`, `TaskTimeStatistics`, and `TimeLogList`.
- Add an editable field for `estimated_minutes`.

#### [MODIFY] `src/features/workspace/components/header-inbox.tsx` (or Navbar)
- Integrate `GlobalTimerWidget` to show active tracking status globally.

#### [MODIFY] `src/features/project/components/project-overview.tsx`
- Integrate `ProjectTimeDashboard` to show tracked time, estimated time, and top contributors.

#### [MODIFY] `src/features/workspace/components/dashboard/...`
- Integrate user specific time stats ("My Time" widget).

---

## Verification Plan

### Automated Tests
- Run `npm run typecheck` and `npm run lint` to ensure type safety for new schemas and components.

### Manual Verification
1. **Timer Persistence**: Start a timer, refresh the page, close and reopen the browser. Verify the timer correctly resumes counting from the `start_time` without losing track.
2. **Single Timer Rule**: Start a timer on Task A, then navigate to Task B and start a timer. Verify the switch modal appears, stops Task A's timer, and starts Task B's.
3. **Manual Entry**: Log 2h 30m manually and verify it adds to the total tracked time for the task.
4. **Permissions**: Verify a regular user cannot edit another user's time entry, while a Workspace Admin can.
5. **Statistics**: Verify that if a task's tracked time exceeds its estimated time, a warning ("Over Estimate") correctly appears.
6. **Activity Feed**: Start a timer and verify "User started tracking time on Task..." appears in the activity feed.
7. **Global Widget**: Verify the timer ticks globally in the navbar and clicking it navigates to the tracked task.
