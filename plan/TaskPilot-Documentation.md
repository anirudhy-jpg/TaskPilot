# TaskPilot — Project Documentation

## Project Overview

TaskPilot is a modern project management and workflow tracking application built to help teams organize work, manage projects, and track task progress in a unified platform. The platform is designed to support modern workflows with an intuitive interface, structured data model, and a foundation for realtime collaboration

The purpose of TaskPilot is to provide an adaptable workspace for managing tasks, projects, and workflows across teams. It serves as a centralized system for planning work, monitoring progress, and preparing the product for advanced collaboration and automation features.



## Project Goals

- **Task Management**: Enable users to create, update, organize, and track tasks across projects.
- **Project Management**: Support project creation, editing, and lifecycle tracking within workspaces.
- **Workflow Tracking**: Provide a board-based workflow view for task status and progress.
- **Team Collaboration (future)**: Expand to shared workspaces, member roles, assignments, and activity history.



## Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- App Router
- Server Actions

### Backend

- Next.js Server Actions

### Database

- Supabase PostgreSQL

### Authentication

- Supabase Auth
- JWT Session Management

### Development Tools

- GitHub

### Future Integrations

- Supabase Realtime
- Supabase Storage
- OpenAI API

---

## System Architecture

```
User
│
▼
Next.js Frontend
(UI + Routing + Server Actions)
│
▼
Supabase Auth
│
▼
PostgreSQL Database
│
├── Profiles
│
├── Workspaces
│
├── Projects
└── Tasks
```

TaskPilot is built as a web-first application where users interact with the Next.js frontend. The frontend manages routing, server actions, and UI rendering. Authentication is handled by Supabase Auth, while persistent data is stored in Supabase PostgreSQL. The database model supports user profiles, workspace scope, projects, and tasks.

---

## Database Architecture

```
profiles
  ├─ id
  ├─ email
  ├─ name
  ├─ avatar_url
  └─ created_at

workspaces
  ├─ id
  ├─ name
  ├─ owner_id
  └─ created_at

workspace_members
  ├─ id
  ├─ workspace_id
  ├─ profile_id
  ├─ role
  └─ joined_at

projects
  ├─ id
  ├─ workspace_id
  ├─ name
  ├─ description
  ├─ status
  └─ created_at

tasks
  ├─ id
  ├─ project_id
  ├─ title
  ├─ description
  ├─ status
  ├─ priority
  └─ due_date
```

```
Profile
│
▼
Workspace
│
▼
Project
│
▼
Task
```

- **profiles**: Stores user identity data, authentication references, and profile metadata.
- **workspaces**: Defines workspace containers for grouping projects and teams.
- **workspace_members**: Tracks membership of profiles in workspaces and supports future role management.
- **projects**: Captures project-level structure, including association to a workspace and project metadata.
- **tasks**: Stores tasks associated with projects, including status and scheduling details.

---

## Development Roadmap

### Phase 1: Core MVP

**Objective:** Build the foundation of the application.

**Features:**

- Authentication
- Workspace Creation
- Project CRUD
- Task CRUD
- Drag and Drop

```
User
│
▼
Workspace
│
▼
Project
│
▼
Task

```

**Deliverables:**

- Authentication
- Workspace Management
- Project Management
- Task Management
- Drag and Drop Board

### Phase 2: Team Collaboration

**Features:**

- Invite Members
- Workspace Members
- Role Management
- Task Assignment
- Activity Logs

```
Team Member
│
▼
Workspace
│
▼
Project
│
▼
Assigned Task
│
▼
Activity Log
```

This phase expands the platform into a shared collaboration environment by adding membership and assignment capabilities. The architecture supports workspaces with multiple contributors and audit-ready activity tracking.

---

### Phase 3: Advanced Task Management

**Features:**

- Priorities
- Labels
- Due Dates
- Subtasks
- Task Dependencies

```
Task
│
├─ Priority
│
├─ Labels
│
├─ Due Date
│
├─ Subtasks
└─ Dependencies
```

This phase improves task granularity and scheduling, enabling teams to categorize work, manage deadlines, and express task relationships with subtasks and dependencies.

---

### Phase 4: Realtime Collaboration

**Features:**

- Live Board Updates
- Realtime Comments
- Notifications
- Kanban Board
- Presence Tracking

Use Supabase Realtime.

```
User
│
▼
Frontend
│
▼
Supabase Realtime
│
▼
Shared Board
│
▼
Live Updates
```

Realtime collaboration enables multiple users to interact with the same board simultaneously, receive live status changes, and stay aware of collaborators through presence indicators.

---

### Phase 5: File Management

**Features:**

- File Upload
- Attachments
- Document Management

Use Supabase Storage.

```
Task
│
▼
Attachment Metadata
│
▼
Supabase Storage
│
▼
File Assets
```

This phase adds support for storing documents and file attachments associated with tasks and projects, enabling richer task context and document-driven workflows.

---

### Phase 6: Search & Productivity

**Features:**

- Global Search
- Task Search
- Project Search
- Filters

```
Search Input
│
▼
Search Service
│
▼
Tasks / Projects
│
▼
Filtered Results
```

Search capabilities help users quickly locate projects and tasks across workspaces. Advanced filtering improves productivity by surfacing relevant work items faster.

## Project Timeline

Total Project Duration: 2 Weeks

**Week 1:**

- Setup
- Authentication
- Database
- Workspace Module
- Project Module

**Week 2:**

- Task CRUD
- Kanban Board
- Drag and Drop
- Testing
- Bug Fixes
- Deployment Preparation

```
Week 1
│
├─ Setup
├─ Authentication
├─ Database
├─ Workspace Module
└─ Project Module

Week 2
│
├─ Task CRUD
├─ Kanban Board
├─ Drag and Drop
├─ Testing
├─ Bug Fixes
└─ Deployment Preparation
```



## Conclusion

TaskPilot is designed to be scalable and extensible. The current architecture supports a clean separation between the Next.js frontend, Supabase authentication, and PostgreSQL-backed persistence. The roadmap positions the product to evolve from a strong MVP into a collaborative, realtime platform with file storage and AI-enhanced productivity.

The project is prepared for:

- collaboration through workspace membership and task assignment,
- realtime functionality via Supabase Realtime,
- storage for attachments with Supabase Storage,
- AI integrations through the OpenAI API. 