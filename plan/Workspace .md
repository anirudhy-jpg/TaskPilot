# TaskPilot Development Progress Report
**Date:** June 9, 2026

Recent progress focuses on implementing the real-time member invitation system, securing project visibility restrictions, establishing a dedicated workspace switcher dashboard, and implementing clean leave workspace mechanics with portal-based modal confirmations.

---

## 1. Routing & Directory Structure Refactoring
We evolved the application's layout paths to consolidate all protected user actions under `/workspace` rather than the placeholder `/dashboard` prefix:
- **Middleware Proxy (`src/proxy.ts`):** Added a redirect handler mapped to forward all `/dashboard/*` requests to `/workspace`. Protected all `/workspace/*` routes to force unauthenticated users to `/login`, and configured authenticated users to automatically redirect to `/workspace` if they attempt to load `/login` or `/signup`.
- **Auth Actions (`src/actions/auth/auth.actions.ts`):** Modified the `loginAction` callback to route users to `/workspace` on successful validation.
- **OAuth Callback (`src/app/(auth)/callback/route.ts`):** Restructured callback routes to redirect queries back to `/workspace`.
- **Landing UI Pages:** Updated `Header.tsx` and `Hero.tsx` components to correctly navigate users into their `/workspace` routes instead of the old `/dashboard` URLs.

---

## 2. Workspace Protected Pages & Real-time Integration
Created the full set of dashboard sub-directories and routes under the protected workspace folder structure:
- `layout.tsx`: The primary container layout for protected views, initializing the workspace sidebar, active profile loader, and dynamic sub-page panels.
- `page.tsx` (Overview): The landing dashboard panel containing active project metrics, quick statistics cards, and chart components.
- `projects/page.tsx` (Projects Grid): View projects inside the active workspace, with click triggers to toggle and load detailed task board layouts.
- `members/page.tsx` (Teammates Panel): Displays collaborators in the current workspace.
- `teams/page.tsx` (Sub-Teams Panel): Manages specialized organization groups.
- `settings/page.tsx` (Workspace Preferences): Updates workspace profiles, names, and metadata.
- `/workspaces/page.tsx` (Workspace Switcher Hub): A separate cockpit showing owned vs. member workspaces, allowing fast cookie-based active workspace switching and leaving.

---

## 3. Real-Time Invitation System & API Routes
We built an asynchronous member invitation and project-assignment pipeline:
- **SSE Stream (`/api/sse/route.ts`):** Keeps a persistent, low-overhead event connection open to poll for new invites and update the header icon bell count badge in real time.
- **Accept/Reject Endpoints (`/api/invitations/accept` & `/api/invitations/reject`):** Updates invitation tables, sets target layouts in cookies, and revalidates Next.js layout routes.
- **Postgres Trigger (`handle_accepted_invitation`):** Executes in PostgreSQL, automatically registering accepted users to project memberships with a default `'member'` role.
- **Project Visibility RLS Constraints**: Restricts regular member access to SELECT/VIEW only projects they are assigned to inside `project_members`, rather than exposing all projects in the workspace.

---

## 4. UI Components & UX Enhancements
Designed and styled interactive frontend elements matching the project's **"Crisp Light & Pine"** design theme:
- **`Sidebar.tsx`:** Dynamic navigation bar showing logo, routes, active profile summary, and a workspace selector dropdown.
- **`HeaderInbox.tsx`:** Bell notification badge that listens to real-time events and enables users to accept/reject invites from any page.
- **`Header.tsx`**: Replaces the **Sign Out** button with a **Leave Workspace** button if the active workspace is a member workspace.
- **`DeleteConfirmModal.tsx`**: Uses React `createPortal` to render directly inside `document.body`, preventing layout elements with `backdrop-filter` or `sticky` from clipping or displacing the modal dialog.
- **Date Hydration fix**: Enforced deterministic date formats on the client-rendered board cards.

---

## 5. Next Steps
1. **Drag-and-Drop Implementation:** Enhance the visual drag-and-drop feedback on the `KanbanBoard` columns.
2. **Notification History Page**: Add a permanent archive list of past invitations and action items.
