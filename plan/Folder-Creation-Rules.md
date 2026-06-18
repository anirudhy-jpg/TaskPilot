# TaskPilot — Directory & File Creation Rules

To maintain high code quality, consistency, and a scalable codebase, developers must adhere strictly to these directory and file creation standards.

---

## 1. Feature-Based Architecture Rules

Do not clutter global directories. Every new block of functionality must belong to a **Feature Module** under `src/features/[feature_name]/`.

### Colocation principle
Keep files close to where they are used. If a service, component, action, hook, or type is only used by one feature, it **MUST** live inside that feature's directory.

```text
src/features/[feature_name]/
├── actions/      # Feature Server Actions
├── components/   # Feature UI Components
│   └── modals/   # Feature Modals
├── services/     # Feature Supabase Queries
├── types/        # Feature TypeScript Definitions
└── utils/        # Feature Helper Utilities
```

---

## 2. Naming Conventions

### File Naming Format: Kebab-Case
All filenames (except where Next.js requires specific names like `page.tsx` or `layout.tsx`) **MUST** use `kebab-case`. This applies to components, services, actions, types, and hooks.
*   **Correct**: `projects-list.tsx`, `create-project-modal.tsx`, `project.service.ts`, `create-project.action.ts`, `project.types.ts`
*   **Incorrect**: `ProjectsList.tsx`, `CreateProjectModal.tsx`, `projectService.ts`, `createProjectAction.ts`

### Server Actions
All server action files must end with `.action.ts` and reside in the feature's `actions/` folder.
*   Example: `src/features/project/actions/create-task.action.ts`

### Services
All service files must end with `.service.ts` and reside in the feature's `services/` folder.
*   Example: `src/features/project/services/task.service.ts`

### Components
All React components use `kebab-case` and end with `.tsx`.
*   Example: `src/features/project/components/kanban-board.tsx`

---

## 3. Strict Layer Separation

### 1. Routes (`src/app/`)
*   **Rule**: Keep routes completely free of business logic and complex UI.
*   **Purpose**: Pages should only resolve request data (e.g. check current session, parse URL parameters, call background services) and render the corresponding feature entry-point component.
*   **Example**:
    ```tsx
    // src/app/(protected)/projects/page.tsx
    import { ProjectService } from "@/features/project/services/project.service"
    import { ProjectsList } from "@/features/project/components/projects-list"

    export default async function ProjectsPage() {
      const projects = await ProjectService.getProjects()
      return <ProjectsList projects={projects} />
    }
    ```

### 2. Components (`src/features/.../components/`)
*   **Rule**: Components should not query the database directly. They use Server Actions for mutations and receive initial data from pages.
*   **Purpose**: Keeps rendering logic distinct from query execution.

### 3. Server Actions (`src/features/.../actions/`)
*   **Rule**: Mark every action file with `"use server"` at the very top.
*   **Purpose**: Server actions represent endpoints called securely from the client. They must perform input validation (using Zod validation schemas) and check user permissions before invoking services.

### 4. Services (`src/features/.../services/`)
*   **Rule**: Service methods query Supabase tables and return raw data.
*   **Purpose**: Abstracts SQL queries and DB clients away from components and actions. Services do not write to the response or trigger cache revalidations directly.

---

## 4. UI Primitives vs Feature Components

*   **Global UI Components (`src/components/ui/`)**: Reserved only for generic, stateless design system building blocks (e.g. Shadcn Button, Dialog, Card). These elements must never import from features, services, or actions.
*   **Feature Components (`src/features/.../components/`)**: Visual elements tied directly to feature workflows (e.g., Board, Sidebar, Forms). These can import primitives from `src/components/ui/` and invoke server actions.
