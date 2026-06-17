# Task Activity Timeline Implementation Plan

This document outlines the step-by-step implementation plan for the new Task Activity Timeline, Comments, Mentions, and Notifications system in TaskPilot.

## 1. Database Schema & Migrations
**File:** `supabase/migrations/<timestamp>_task_activities_and_comments.sql`
- Create `task_activities` table to record task changes (e.g., status, priority, assignee changes).
- Create `task_comments` table for user comments on tasks.
- Create `task_comment_mentions` table for `@` mentions in comments.
- Update `notifications` table (or verify it can handle mention types).
- Add Postgres Functions/Triggers to automatically log `task_activities` on `tasks` table updates/inserts.
- Configure Row Level Security (RLS) policies for the new tables.
- Enable Supabase Realtime for `task_activities`, `task_comments`, and `task_comment_mentions`.

## 2. Types Update
**File:** `src/features/project/types/project.types.ts`
- Define `TaskActivity` interface.
- Define `TaskComment` interface.
- Define `TaskCommentMention` interface.
- Add activity constants (e.g., `TASK_CREATED`, `STATUS_CHANGED`).

## 3. Services Layer
**File:** `src/features/tasks/services/task-activity.service.ts` (New)
- Methods to fetch combined timeline (activities + comments) paginated.
- Methods to create, edit, delete comments.
- Methods to create mentions.
- Ensure efficient querying (merging activities and comments ordered by `created_at`).

## 4. Server Actions
**Files:** `src/features/tasks/actions/`
- `add-comment.action.ts`
- `update-comment.action.ts`
- `delete-comment.action.ts`
- `mention-user.action.ts`

## 5. Realtime Hooks
**File:** `src/features/tasks/hooks/use-task-timeline-realtime.ts` (New)
- Custom hook using `useRealtimeSubscription` to listen for inserts/updates/deletes on `task_activities` and `task_comments`.
- Optimistic UI updates integration.

## 6. UI Components
**Directory:** `src/features/tasks/components/timeline/` (New)
- `TaskTimeline.tsx`: Main container merging activities and comments, handling infinite scroll.
- `TimelineActivityItem.tsx`: Renders a single activity (e.g., "Anirudh changed status to In Progress").
- `TimelineCommentItem.tsx`: Renders a comment with edit/delete options and relative timestamps.
- `CommentComposer.tsx`: Sticky input field with mention support (`@`).

**File:** `src/features/tasks/components/mention-selector.tsx` (New)
- Dropdown component that appears when `@` is typed, filtering workspace members.

## 7. Modal Integration
**File:** `src/features/tasks/components/modals/task-details-modal.tsx`
- Redesign the layout to a split view (Jira/ClickUp style).
- Left side: Task Details (Title, Description, Status, Priority, Assignee).
- Right side: Unified Activity Timeline (`TaskTimeline` component) and `CommentComposer`.

## 8. Notifications Integration
**File:** `src/features/workspace/components/header-inbox.tsx`
- Ensure the realtime hook captures the new `mention` notification type.
- Render mention notifications specifically (e.g., "Anirudh mentioned you in task X").

## Implementation Steps Execution Order:
1. Generate the SQL Migration and run it.
2. Define the TypeScript interfaces and types.
3. Build the Service and Server Actions for Comments and Timeline fetching.
4. Build the Realtime Hook for the timeline.
5. Create the UI Components (Timeline, Activity Item, Comment Item, Mention Selector, Composer).
6. Integrate everything into the `TaskDetailsModal`.
7. Update the Notifications system to handle mentions.
8. Test end-to-end functionality.
