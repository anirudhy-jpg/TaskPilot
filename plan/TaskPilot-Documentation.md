# TaskPilot — Project Documentation

> **Last Updated:** June 17, 2026 — Reflects full production state of the application.

## Project Overview

TaskPilot is a modern project management and workflow tracking application built to help teams organize work, manage projects, and track task progress in a unified platform. The platform is designed to support modern workflows with an intuitive interface, structured data model, and a fully realized realtime collaboration system.

The purpose of TaskPilot is to provide an adaptable workspace for managing tasks, projects, and workflows across teams. It serves as a centralized system for planning work, monitoring progress, and enables advanced collaboration through invitations, role-based access, real-time updates, and workspace-level analytics.

---

## Project Goals

- **Task Management** ✅: Create, update, organize, and track tasks across projects with priority, due dates, descriptions, assignees, subtasks, and rich interaction elements.
- **Task Collaboration** ✅: Task-level comments, interactive activity timelines, and progress tracking via subtasks.
- **Project Management** ✅: Project creation, editing, deletion, and lifecycle tracking with kanban boards and custom columns.
- **Workflow Tracking** ✅: Board-based workflow view with drag-and-drop task management and custom column workflows.
- **Team Collaboration** ✅: Shared workspaces, member roles, email invitations, task assignments, and activity notifications.
- **Realtime Sync** ✅: Instant board updates across all connected clients via Supabase Realtime WebSocket channels.
- **Workspace Analytics** ✅: Live workspace overview dashboard with task distribution charts, member activity stats, and notification feed.

---

## Technology Stack

### Frontend

- **Next.js** (App Router, `force-dynamic` pages)
- **TypeScript**
- **Tailwind CSS v4** (with semantic design tokens in `globals.css`)
- **Server Actions** (for all mutations)
- **`@dnd-kit/core` + `@dnd-kit/sortable`** (drag-and-drop engine)
- **Recharts** (workspace analytics charts)
- **Lucide React** (icon library)
- **`next/dynamic`** (code-split KanbanBoard for performance)

### Backend

- **Next.js Server Actions** (`"use server"` functions)
- **Next.js Route Handlers** (`app/api/` for invite accept/reject)
- **Supabase Edge / Postgres Functions** (RPC for atomic column deletion)

### Database

- **Supabase PostgreSQL**
- **Supabase Realtime** (WebSocket channels for live board sync)
- **Row Level Security (RLS)** (on all tables)

### Authentication

- **Supabase Auth** (Email/Password + GitHub OAuth)
- **JWT Session Management** via `@supabase/ssr` (server-side cookie sessions)
- **Middleware proxy** (`src/proxy.ts`) for route guards and redirects

### External Integrations

- **SendGrid** (`@sendgrid/mail`) — transactional email delivery for workspace invitations

### Development Tools

- **GitHub** (version control)
- **Supabase CLI** (migrations)

### Future Integrations

- Supabase Storage (file attachments)
- OpenAI / Gemini API (AI-enhanced task management)

---

## System Architecture

```
User
│
▼
Next.js Frontend
(App Router, Server Components, Client Islands)
│
├── Server Actions ──────────► Supabase PostgreSQL
│                                  │
├── Supabase Auth ◄─────────────── ┤
│                                  ├── profiles
├── Realtime Channels ◄────────── ┤── workspaces
│   (WebSockets)                   ├── workspace_members
│                                  ├── projects
└── SendGrid API ◄──── Invitations ├── tasks
    (Email delivery)               ├── task_activities
                                   ├── task_comments
                                   ├── task_subtasks
                                   ├── columns
                                   ├── workspace_invitations
                                   ├── project_members
                                   └── notifications
```

---

## Database Architecture (Current — Full Schema)

```
profiles
  ├─ id (UUID, FK → auth.users)
  ├─ email
  ├─ full_name
  ├─ avatar_url
  ├─ created_at
  └─ updated_at

workspaces
  ├─ id
  ├─ name
  ├─ owner_id (FK → profiles)
  └─ created_at

workspace_members
  ├─ id
  ├─ workspace_id (FK → workspaces)
  ├─ user_id (FK → profiles)
  ├─ role ('owner' | 'admin' | 'member')
  └─ joined_at

projects
  ├─ id
  ├─ workspace_id (FK → workspaces)
  ├─ name
  ├─ description
  ├─ status ('active' | 'archived' | 'completed')
  └─ created_at

columns
  ├─ id
  ├─ board_id (FK → projects)
  ├─ name
  ├─ position (DOUBLE PRECISION — fractional indexing)
  └─ created_at

tasks
  ├─ id
  ├─ project_id (FK → projects)
  ├─ column_id (FK → columns)
  ├─ title
  ├─ description
  ├─ status ('todo' | 'in_progress' | 'done')
  ├─ priority ('low' | 'medium' | 'high')
  ├─ position (DOUBLE PRECISION — fractional indexing)
  ├─ assigned_to (FK → profiles, nullable)
  └─ created_at

task_subtasks
  ├─ id
  ├─ task_id (FK → tasks)
  ├─ title
  ├─ completed (BOOLEAN)
  ├─ position (INTEGER)
  └─ created_at

task_activities
  ├─ id
  ├─ task_id (FK → tasks)
  ├─ actor_id (FK → profiles)
  ├─ action_type (TEXT)
  ├─ old_value (JSONB)
  ├─ new_value (JSONB)
  ├─ metadata (JSONB)
  └─ created_at

task_comments
  ├─ id
  ├─ task_id (FK → tasks)
  ├─ author_id (FK → profiles)
  ├─ content
  ├─ edited (BOOLEAN)
  └─ created_at

task_comment_mentions
  ├─ id
  ├─ comment_id (FK → task_comments)
  ├─ mentioned_user_id (FK → profiles)
  └─ created_at

project_members
  ├─ id
  ├─ project_id (FK → projects)
  ├─ user_id (FK → profiles)
  ├─ role ('admin' | 'member')
  └─ joined_at

workspace_invitations
  ├─ id
  ├─ workspace_id (FK → workspaces)
  ├─ email
  ├─ role ('admin' | 'member')
  ├─ token (UUID, UNIQUE)
  ├─ status ('pending' | 'accepted' | 'declined')
  ├─ invited_by (FK → profiles)
  ├─ created_at
  ├─ expires_at
  └─ project_ids (UUID[])

notifications
  ├─ id
  ├─ user_id (FK → profiles)
  ├─ workspace_id (FK → workspaces, nullable)
  ├─ task_id (FK → tasks, nullable)
  ├─ comment_id (FK → task_comments, nullable)
  ├─ title
  ├─ message
  ├─ type
  ├─ read (BOOLEAN)
  ├─ actor_id (FK → profiles, nullable)
  └─ created_at
```

---

## Development Roadmap — Current Status

### ✅ Phase 1: Core MVP — COMPLETE

- [x] Authentication (Email/Password + GitHub OAuth)
- [x] Workspace creation and onboarding guard
- [x] Project CRUD (Create, Read, Update, Delete)
- [x] Task CRUD with priority, due dates, descriptions, and assignees
- [x] Drag-and-drop Kanban board (`@dnd-kit`, fractional indexing)
- [x] Custom column management (add, rename, reorder, delete — max 5)
- [x] Column seeding on project creation (To Do, In Progress, Done)

### ✅ Phase 2: Team Collaboration — COMPLETE

- [x] Email-based workspace invitations (SendGrid + token flow)
- [x] Workspace member management (invite, remove, leave)
- [x] Role-based access (owner / admin / member)
- [x] Task assignment to workspace members
- [x] Project-level member management (add/remove from projects)
- [x] Notification system (invitation accepted/rejected, member left)
- [x] Real-time notification inbox in header (`HeaderInbox`)

### ✅ Phase 3: Advanced Task Management — COMPLETE

- [x] Task priorities (Low / Medium / High)
- [x] Task descriptions (rich textarea)
- [x] Task due dates
- [x] Assignee selector on task cards and detail modal
- [x] Task details modal (full edit UI)
- [x] Task status cycling on dashboard grid
- [x] Task subtasks tracking with UI and database integration
- [x] Real-time task comments with user mentions
- [x] Automatically tracked chronological activity feeds via database triggers

### ✅ Phase 4: Realtime Collaboration — COMPLETE

- [x] **Live board sync**: Task INSERT/UPDATE/DELETE sync instantly via Supabase Realtime
- [x] **Project list sync**: Sidebar and dashboard update without reload
- [x] **Member eviction**: Removed members are redirected immediately
- [x] **Invitation inbox**: Header bell updates in real-time
- [x] **Workspace sync**: Workspace name/deletion updates propagate instantly
- [x] Reusable `lib/realtime/` abstraction layer (channel factory, list hook, subscription hook)

### ✅ Phase 5: Workspace Analytics Dashboard — COMPLETE

- [x] Workspace overview page with task distribution pie chart
- [x] Project progress bar chart (total vs. completed tasks per project)
- [x] Member stats table (tasks assigned, completed, completion rate)
- [x] Recent activity / notification feed panel
- [x] Workspace-level aggregation using parallel server-side fetching

### ✅ Phase 6: UX & UI Polish — COMPLETE

- [x] Monochrome dark mode design system (Tailwind CSS semantic tokens)
- [x] Custom scrollbar styles (`globals.css`)
- [x] Animated skeleton loaders (Kanban board SSR fallback)
- [x] Top loading progress bar during server transitions
- [x] Custom 404 page (`not-found.tsx`) with micro-animations
- [x] Pagination on the project dashboard grid (6 projects per page)
- [x] Portal-rendered modals (avoid `backdrop-filter` clipping)
- [x] React `memo` optimizations on Kanban card components
- [x] Column add button conditionally hidden when 5-column limit is reached

### 🔲 Phase 7: Search & Productivity — FUTURE

- [ ] Global search dialog (Command-K / `cmdk`)
- [ ] Sidebar filter toggles (by assignee, priority, status)
- [ ] Task search within a project

---

## Conclusion

TaskPilot has evolved from a planned two-week MVP into a fully-featured, production-ready collaborative project management platform. All core phases (authentication, workspace management, project/task CRUD, kanban board, team collaboration, realtime sync, analytics, and UI polish) are now **complete and functional**.

The architecture maintains a clean separation between the Next.js App Router (routing only), feature modules (business logic), server actions (mutations), and Supabase services (data layer). The codebase is fully type-safe, follows feature-based colocation conventions, and is ready for the next phase of search enhancements.
