# Task Attachments Feature (Implemented)

This document details the architecture, implementation, and components of the file attachment system built for TaskPilot using Next.js 15, TypeScript, Supabase, Server Actions, React Query, and TailwindCSS.

**Status:** Fully Implemented and Refined.

---

## 🏗️ Architecture & How It Works

The attachment system relies on a hybrid approach for file uploading and metadata management to ensure a smooth, progress-tracked user experience while maintaining robust server-side security.

### 1. Upload Flow
1. **Client-Side Upload:** Because Next.js Server Actions do not currently support progress events for file streams effectively, the file is uploaded directly from the client browser to a Supabase Storage bucket (`attachments`) using `@supabase/supabase-js`. This allows the UI to display a real-time progress bar or loading spinner.
2. **Metadata Registration:** Once the storage upload succeeds, the client calls a Next.js Server Action (`upload-attachment.action.ts`).
3. **Database Insertion:** The Server Action records the file metadata (name, path, size, MIME type, uploader ID, task ID) into the PostgreSQL `task_attachments` table.
4. **Activity Logging:** The same Server Action creates an entry in the `activities` table noting that the user uploaded an attachment.

### 2. Retrieval & Display Flow
1. **Fetching:** A React Query hook (`use-task-attachments`) calls a Server Action (`get-task-attachments.action.ts`) to fetch attachment metadata for a specific task.
2. **Signed URLs:** To keep files secure, the Server Action dynamically generates short-lived signed URLs for each file from Supabase Storage and returns them with the metadata.
3. **Rendering:** The client components render the files in a ClickUp-inspired grid layout. Images are displayed using optimized `next/image` components, while documents show corresponding icons.

### 3. Deletion Flow
1. **User Action:** A user clicks delete on an attachment, triggering a reusable `DeleteConfirmationModal`.
2. **Optimistic UI:** Upon confirmation, the UI updates optimistically to remove the item instantly.
3. **Server Action:** The client invokes `delete-attachment.action.ts`.
4. **Cleanup:** The Server Action removes the metadata record from the `task_attachments` table, deletes the actual file from the Supabase Storage bucket, and logs the deletion event in the `activities` table.

---

## 🗂️ Implemented Components

The feature is organized into a cohesive, modular structure within `src/features/attachments`:

### Actions (`src/features/attachments/actions/`)
- **`upload-attachment.action.ts`**: Registers attachment metadata in the database after client upload and logs activity.
- **`delete-attachment.action.ts`**: Removes storage file, deletes DB record, and logs activity.
- **`get-task-attachments.action.ts`**: Fetches attachment records and generates secure signed URLs.

### Hooks (`src/features/attachments/hooks/`)
- **`use-task-attachments.ts`**: React Query hook for fetching and caching attachments.
- **`use-upload-attachment.ts`**: Handles the direct-to-storage upload logic and orchestrates the Server Action call.
- **`use-delete-attachment.ts`**: Wraps the delete Server Action with optimistic cache updates.

### UI Components (`src/features/attachments/components/`)
- **`AttachmentList.tsx`**: The main container that renders the grid of attachments and handles empty/loading states.
- **`AttachmentItem.tsx`**: Renders individual files. Uses Next.js `<Image>` for image types to ensure performance and accessibility. Includes hover states, download buttons, and the delete confirmation integration.
- **`AttachmentUpload.tsx`**: Provides the UI for initiating an upload.
- **`AttachmentPreviewModal.tsx`**: A dedicated modal for viewing full-size images or documents without leaving the task view.

### Integration
- **`task-details-modal.tsx`**: Integrates the attachment list and upload components seamlessly into the Task Details view.

---

## 🛠️ Database & Storage Schema

- **Table:** `task_attachments`
  - Columns: `id` (uuid), `task_id` (uuid), `uploaded_by` (uuid), `file_name` (text), `file_path` (text), `file_size` (integer), `mime_type` (text), `created_at` (timestamp).
- **Storage Bucket:** `attachments`
- **Security:** Storage and DB access are mediated by Server Actions, which validate user authentication, workspace membership, and permissions before executing operations.

---

## ✨ Recent Refinements & Optimizations

- **Performance & Accessibility:** Replaced all standard HTML `<img>` tags with Next.js `<Image>` components to resolve linting warnings and improve load times.
- **Type Safety:** Eliminated `any` types across hooks and actions, ensuring strict TypeScript validation for error handling and payloads.
- **UI Stability:** Resolved flickering issues during upload and deletion by refining how React Query invalidates cache and manages `isLoading` states.
- **ClickUp-Style Aesthetics:** Implemented a modern, responsive grid layout for attachments with dedicated preview modals, file-type icons, and smooth hover interactions.
- **Timeline Integration:** Fully integrated upload and delete events into the task's Activity Timeline for comprehensive audit trails.
