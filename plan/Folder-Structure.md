# TaskPilot — Directory Structure

This document details the project folder structure of the TaskPilot codebase. It serves as a guide for developers to locate files, understand conventions, and maintain clean separation of concerns under our **Feature-Based Architecture**.

## Directory Tree

```text
taskpilot/
├── plan/                             # Project design documentation and planning
│   ├── Folder-Structure.md           # This folder structure documentation
│   ├── Folder-Creation-Rules.md      # Rules and standards for folder/file creation
│   ├── Kanban-Implementation.md      # Kanban board drag-and-drop system documentation
│   ├── Realtime-Implementation.md    # Real-time collaboration system documentation
│   ├── TaskPilot-Documentation.md    # Core technical project documentation
│   └── Workspace.md                 # Workspace planning details
├── public/                           # Static public assets (logos, SVGs, etc.)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/                              # Application source code
│   ├── app/                          # Next.js App Router (URL Routing & Layouts ONLY)
│   │   ├── (auth)/                   # Public authentication pages route group
│   │   │   ├── callback/             # OAuth callback route for Supabase Auth redirect
│   │   │   │   └── route.ts
│   │   │   ├── login/                # Login page route
│   │   │   │   └── page.tsx
│   │   │   └── signup/               # Signup page route
│   │   │       └── page.tsx
│   │   ├── (protected)/              # Protected dashboard pages requiring active session
│   │   │   ├── layout.tsx            # Protected pages shell (Header, Sidebar wrapper)
│   │   │   ├── members/              # Team members overview page
│   │   │   │   └── page.tsx
│   │   │   ├── projects/             # Projects listing and dynamic kanban routes
│   │   │   │   ├── page.tsx
│   │   │   │   └── [projectId]/      # Dynamic route for a specific project's board
│   │   │   │       └── page.tsx
│   │   │   ├── settings/             # Project & account settings page
│   │   │   │   └── page.tsx
│   │   │   ├── teams/                # Teams overview page
│   │   │   │   └── page.tsx
│   │   │   ├── workspace/            # Workspace overview analytics page
│   │   │   │   └── page.tsx
│   │   │   └── workspaces/           # Workspace switcher hub page
│   │   │       ├── loading.tsx
│   │   │       └── page.tsx
│   │   ├── api/                      # REST API endpoints
│   │   │   ├── invitations/          # Invitation endpoints
│   │   │   │   ├── accept/
│   │   │   │   │   └── route.ts
│   │   │   │   └── reject/
│   │   │   │       └── route.ts
│   │   │   └── sse/
│   │   │       └── route.ts          # SSE Real-time invitations event stream
│   │   ├── favicon.ico
│   │   ├── globals.css               # Global Tailwind CSS and app-wide styles
│   │   ├── layout.tsx                # Main HTML layout wrapper
│   │   └── page.tsx                  # Public landing page route
│   ├── components/                   # Shared components
│   │   └── ui/                       # Shared UI primitives (buttons, inputs, cards) - Shadcn/Radix
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── logo.tsx
│   ├── features/                     # Feature-Based Modules (Business logic & UI live here)
│   │   ├── auth/                     # Authentication feature
│   │   │   ├── actions/              # Auth server actions (login, signup, logout)
│   │   │   │   ├── login.action.ts
│   │   │   │   ├── logout.action.ts
│   │   │   │   └── signup.action.ts
│   │   │   ├── components/           # Auth form views and layouts
│   │   │   │   ├── auth-layout.tsx
│   │   │   │   ├── login-form.tsx
│   │   │   │   └── signup-form.tsx
│   │   │   └── schemas/              # Input validation schemas (Zod)
│   │   ├── landing/                  # Public landing page feature
│   │   │   └── components/           # Sections (Hero, Features, TechStack)
│   │   ├── project/                  # Project & task board feature
│   │   │   ├── actions/              # Project & task server actions (CRUD)
│   │   │   ├── components/           # Kanban, lists, and project-specific views
│   │   │   │   ├── kanban/           # Kanban column & card components
│   │   │   │   ├── modals/           # Project/task creation and details modals
│   │   │   │   └── projects-list.tsx
│   │   │   ├── services/             # Project and task Supabase DB queries
│   │   │   │   ├── project.service.ts
│   │   │   │   └── task.service.ts
│   │   │   ├── types/                # Project & task type definitions
│   │   │   │   └── project.types.ts
│   │   │   └── utils/                # Utilities (avatars, initials generators)
│   │   └── workspace/                # Workspace & membership feature
│   │       ├── actions/              # Workspace management server actions
│   │       ├── components/           # Sidebar, header, members-list, workspaces-client
│   │       │   ├── modals/           # Workspace-specific modals (Invite, Switch)
│   │       ├── services/             # Workspace, members, and invite DB queries
│   │       │   ├── workspace.service.ts
│   │       │   ├── workspace-hub.service.ts
│   │       │   ├── member.service.ts
│   │       │   └── invite.service.ts
│   │       └── types/                # Workspace & member type definitions
│   │           └── workspace.types.ts
│   ├── lib/                          # Shared utilities and SDK client instances
│   │   ├── proxy/                    # Middleware proxy helper logic
│   │   ├── supabase/                 # Supabase client instantiation (@supabase/ssr)
│   │   └── utils.ts                  # Tailwind class merging helper
│   ├── proxy.ts                      # Local proxy server configuration
│   └── services/                     # Legacy global services (to be fully phased out)
│       ├── auth.service.ts           # Profile & auth support
│       └── profile.service.ts
```

## Core Abstraction Layers

### 1. Routing (`src/app/`)
Strictly reserved for Next.js file-system routing. Routes should contain almost no business logic. They call features, fetch layout-level data, and pass them as properties to feature page components.

### 2. Feature Modules (`src/features/[feature_name]/`)
The core of our business logic. Rather than spreading files across global `components`, `actions`, and `services` folders, all code related to a single domain (e.g., `project`, `workspace`) is colocated inside its feature directory.

*   **`actions/`**: Server actions (`"use server"`) handling mutations, data submission, and validation.
*   **`components/`**: UI components specific to the feature. Subdivided into folders like `modals/` or domain-specific modules.
*   **`services/`**: Directly queries the Supabase client. Responsible for data fetching, inserts, updates, and deletes.
*   **`types/`**: Domain specific TypeScript interfaces and type guards.
*   **`utils/`**: Feature-specific utility helpers.

### 3. Shared Presentation Layer (`src/components/ui/`)
Holds globally reusable design system elements (e.g., buttons, input fields, labels). These have no dependency on business logic or Supabase.

### 4. Shared Utilities & Configuration (`src/lib/`)
Shared utilities like class-merging helper functions or third-party client initializations (e.g., Supabase browser and server wrappers).
