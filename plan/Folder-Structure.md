# TaskPilot — Directory Structure

This document details the project folder structure of the TaskPilot codebase. It serves as a guide for developers to locate files, understand conventions, and maintain clean separation of concerns.

## Directory Tree

```text
taskpilot/
├── plan/                         # Project design documentation and planning
│   ├── Directory-Structure.md    # This folder structure documentation
│   ├── TaskPilot-Documentation.md# Core technical project documentation
│   └── Workspace .md            # Workspace planning details
├── public/                       # Static public assets (logos, SVGs, etc.)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/                          # Application source code
│   ├── actions/                  # Next.js Server Actions grouped by feature
│   │   ├── auth/                 # Authentication actions (login, signup, logout)
│   │   │   └── auth.actions.ts
│   │   ├── invite.actions.ts      # Invitation sending server actions
│   │   └── workspace/            # Workspace management actions (CRUD actions)
│   │       ├── workspace.actions.ts
│   │       └── workspace-hub.actions.ts # Isolated active workspace switching & leaving actions
│   ├── app/                      # Next.js App Router root layout & routing
│   │   ├── (auth)/               # Public authentication pages route group
│   │   │   ├── callback/         # OAuth callback route for Supabase Auth redirect
│   │   │   │   └── route.ts
│   │   │   ├── login/            # Login page route
│   │   │   │   └── page.tsx
│   │   │   └── signup/           # Signup page route
│   │   │       └── page.tsx
│   │   ├── (protected)/          # Protected dashboard pages requiring active session
│   │   │   ├── layout.tsx        # Common workspace dashboard layout shell (Sidebar, top nav)
│   │   │   ├── members/          # Team members overview page
│   │   │   │   └── page.tsx
│   │   │   ├── projects/         # Projects listing and dynamic kanban routes
│   │   │   │   ├── page.tsx
│   │   │   │   └── [projectId]/  # Dynamic route for a specific project's board
│   │   │   │       └── page.tsx
│   │   │   ├── settings/         # Project & account settings page
│   │   │   │   └── page.tsx
│   │   │   ├── teams/            # Teams overview page
│   │   │   │   └── page.tsx
│   │   │   ├── workspace/        # Workspace overview page
│   │   │   │   └── page.tsx
│   │   │   └── workspaces/       # Workspace switcher hub page (owned & membered workspaces)
│   │   │       ├── loading.tsx   # Loading skeletal framework
│   │   │       └── page.tsx
│   │   ├── api/                  # API endpoints
│   │   │   ├── invitations/      # Invitation endpoints
│   │   │   │   ├── accept/
│   │   │   │   │   └── route.ts  # Accepts invite, cookies set, auto-joins project
│   │   │   │   └── reject/
│   │   │   │       └── route.ts  # Rejects invite
│   │   │   └── sse/
│   │   │       └── route.ts      # SSE Real-time invitations event stream listener
│   │   ├── favicon.ico           # Application favicon
│   │   ├── globals.css           # Global Tailwind and app-wide CSS styles
│   │   ├── layout.tsx            # Main HTML layout wrapper
│   │   └── page.tsx              # Public landing page route
│   ├── components/               # Reusable React components
│   │   ├── auth/                 # Authentication components
│   │   │   ├── AuthLayout.tsx    # Auth page layout wrapper
│   │   │   ├── LoginForm.tsx     # Sign-in form component
│   │   │   └── SignupForm.tsx    # Sign-up form component
│   │   ├── landing/              # Marketing landing page components
│   │   │   ├── Features.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── InteractiveDemo.tsx
│   │   │   └── TechStack.tsx
│   │   ├── ui/                   # Shared UI primitives (buttons, inputs, cards)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── logo.tsx
│   │   └── workspace/            # Workspace/Dashboard layout and features
│   │       ├── modals/           # Modal dialogues (create/delete confirmation)
│   │       │   ├── CreateProjectModal.tsx
│   │       │   ├── CreateTaskModal.tsx
│   │       │   └── DeleteConfirmModal.tsx
│   │       ├── Header.tsx        # Top navbar containing profile chip and switcher/leave button
│   │       ├── HeaderInbox.tsx   # SSE Real-time bell notification inbox dropdown component
│   │       ├── KanbanBoard.tsx   # Project task board with drag & drop support
│   │       ├── MembersList.tsx   # Workspace members rendering
│   │       ├── OverviewCharts.tsx# Analytics/charts dashboard
│   │       ├── ProjectsList.tsx  # Project list and grid cards rendering
│   │       ├── SettingsPanel.tsx # Workspace settings manager
│   │       ├── Sidebar.tsx       # Sidebar navigation menu
│   │       ├── TeamsList.tsx     # Team listing component
│   │       └── WorkspacesClient.tsx # Client dashboard for switcher page
│   ├── lib/                      # Shared utility functions and third-party SDK clients
│   │   ├── proxy/                # Proxy authentication middleware logic
│   │   │   ├── auth.ts
│   │   │   └── redirects.ts
│   │   ├── supabase/             # Supabase clients for server and client side
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── utils.ts              # Tailwind CSS class merging helpers
│   ├── proxy.ts                  # Middleware proxy server logic
│   ├── services/                 # API client services communicating with Supabase
│   │   ├── auth.service.ts       # Auth methods wrapper
│   │   ├── member.service.ts     # Workspace members DB queries
│   │   ├── profile.service.ts    # Profile table queries
│   │   ├── project.service.ts    # Projects CRUD DB queries
│   │   ├── task.service.ts       # Tasks CRUD and status update queries
│   │   ├── workspace.service.ts  # Workspaces CRUD queries
│   │   └── workspace-hub.service.ts # Isolated workspace switcher & leaving queries
│   ├── types/                    # Shared TypeScript interfaces & types
│   │   ├── auth.types.ts
│   │   └── workspace.types.ts
│   └── validation/               # Zod schemas for input validation
│       └── auth.validation.ts
│ ├── supabase_rls_policies.sql     # Database setup schema, tables, and RLS policies
│ ├── components.json               # Shadcn UI configuration file
│ ├── eslint.config.mjs             # ESLint rules configuration
│ ├── next.config.ts                # Next.js compiler and runtime configuration
│ ├── package.json                  # Dependencies and scripts definitions
│ ├── postcss.config.mjs            # PostCSS plugin settings
│ └── tsconfig.json                 # TypeScript compiler configuration
```

## Core Modules & Folders Breakdown

### 1. `src/app` (Next.js App Router)
Handles routing and pages structure.
- **`(auth)`**: Route group containing the authentication pages (`/login`, `/signup`, `/callback`).
- **`(protected)`**: Route group containing routes that require the user to be logged in. It uses a common nested `layout.tsx` which includes the persistent navigation `Sidebar`.
- **`globals.css`**: Application-wide style sheet managing Tailwind variables and theme colors.

### 2. `src/components`
Re-usable visual components.
- **`auth`**: Authentication-related layouts and forms.
- **`landing`**: Main marketing landing page components (Hero, Features, TechStack, etc.).
- **`ui`**: Raw building block elements (buttons, inputs, cards, etc.).
- **`workspace`**: Core board features (Kanban, Lists, Modals, Sidebar).

### 3. `src/lib`
Configuration and wrappers for external services.
- **`supabase`**: Standard instantiation of browser and server clients, implementing standard `@supabase/ssr` cookies management.
- **`proxy`**: Custom middleware redirect proxy rules.

### 4. `src/services`
Abstraction layer for Supabase queries. These files house all DB fetch/mutation queries for Projects, Tasks, Members, Workspaces, and Profiles, allowing components and actions to remain clean.

### 5. `src/actions`
Next.js Server Actions used to handle mutations and form submissions securely on the server-side.
