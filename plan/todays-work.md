Project: TaskPilot (Next.js + Supabase)

*(Note: Work for June 19, 2026 has been moved to `2026-06-19.md`)*

---

## 📅 Previous Work

1. **Fixed TypeScript Build Error**
   There was a missing Project type in `projects/page.tsx` that was breaking the production build. Found and added the correct import so the build passed cleanly.

2. **Updated App Favicon**
   Replaced the default generic favicon with the actual TaskPilot brand icon. The icon now shows correctly in the browser tab.

3. **Cleaned Up Unused Imports**
   Removed unused TaskPriority type imports from server action files (`create-task.action.ts`, `update-task.action.ts`) to clear linting warnings.

4. **Made Pagination UI Smaller**
   The pagination bar on the projects dashboard was too wide and looked off. Adjusted the styling to make it more compact and visually balanced.

5. **Added Zod Validation to All Server Actions**
   Created a centralized validation layer under `src/lib/validations/` with Zod schemas for Tasks, Projects, Workspaces, Kanban, and Invitations. Updated all server actions to run `safeParse()` before interacting with the database.

6. **Wrote Business Validation Tests (Vitest)**
   Set up Vitest and wrote focused test files for each schema (`tests/*.schema.test.ts`). Tests cover both valid inputs and invalid inputs without mocking.

7. **Fixed Kanban Board Task Visibility**
   Fixed task-grouping logic to rely only on `column_id` instead of the deprecated status column, ensuring drag-and-drop persists correctly to Supabase.

8. **Implemented Task Comments System**
   Added a full commenting feature inside the Task Details Modal with real-time updates using Supabase subscriptions.

9. **Fixed Real-Time Member Updates**
   Added a Supabase real-time subscription on the `workspace_members` table so the UI updates instantly when a member leaves a workspace.

10. **Full Linting & Type Safety Cleanup**
    Replaced `any` types with proper interfaces, fixed React hook anti-patterns, and removed dead code for zero linting errors.

11. **Built Subtasks Feature**
    Added the ability to create subtasks inside any task, stored in a dedicated `subtasks` table. Included real-time sync and optimistic UI.

12. **Built Activity Timeline Feature**
    Added an Activity / History tab inside the Task Details Modal to record every important change on a task (status, priority, assignee, comments, etc.).

13. **Implemented Task Type Field & Filter**
    Added a new `type` field for tasks (Task, Feature, Bug, Enhancement) via a database migration and migrated the filter to `ProjectBoardHeader`.

14. **Added AI-Driven Email Autocomplete**
    Integrated dynamic, database-driven email suggestions using native browser `<datalist>` in `SignupForm` and `InviteMemberModal`.

15. **Built Project Task Inbox Notifications**
    Created a `NotificationService` and enhanced the `HeaderInbox` UI to alert users when added to projects or assigned to tasks.

📦 **Files / Folders Created**
| File/Folder | What it is |
|-------------|------------|
| `src/lib/validations/*.schema.ts` | Zod schemas for application entities |
| `tests/*.schema.test.ts` | Vitest tests for validations |
| `src/features/tasks/services/task-subtasks.service.ts` | Subtasks DB service |
| `src/features/tasks/actions/get-task-timeline.action.ts` | Activity timeline server action |
| `supabase/migrations/20260618180000_add_task_type.sql` | Migration for adding task type |

🏁 **End of Day Status**
✅ App builds successfully
✅ Lint is clean (zero errors/warnings)
✅ All new tests pass
✅ Dev server running fine
✅ Kanban drag-and-drop works and persists
✅ Comments & real-time updates working
✅ Subtasks & Activity timeline functional
✅ Search features fully integrated and persistent
