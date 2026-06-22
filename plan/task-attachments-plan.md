# Implement Task Attachments Feature

This implementation plan details the steps and architecture required to build out the full file attachment system for tasks within TaskPilot using Next.js 15, TypeScript, Supabase, Server Actions, React Query, and TailwindCSS.

## User Review Required

> [!WARNING]
> We will need to create a new Supabase Storage Bucket named `attachments`. Please confirm if you would like me to write a Supabase Migration script for this and the `task_attachments` table, or if you will run SQL snippets directly in the Supabase Dashboard. 

## Open Questions

> [!IMPORTANT]
> 1. To track the upload progress visually, we typically cannot use Server Actions alone for the actual file upload stream because Server Actions do not currently support progress events cleanly. We will need to upload directly from the Client (browser) to Supabase Storage using `@supabase/supabase-js`, and then call a Server Action to record the database entry in `task_attachments`. Does this approach align with your architecture?
> 2. Are we using a specific UI component library for the drag-and-drop file upload (e.g., `react-dropzone`), or should I build a custom drag-and-drop area using native HTML5 drag-and-drop events?

## Proposed Changes

---

### Database & Storage Schema

#### [NEW] `supabase/migrations/[timestamp]_task_attachments.sql`
- Create `task_attachments` table with `uuid`, `task_id`, `uploaded_by`, `file_name`, `file_path`, `file_size`, `mime_type`, and `created_at`.
- Since RLS is NOT used, ensure Server Actions explicitly validate workspace membership and roles before allowing database mutations.
- Create `attachments` Storage bucket.
- Storage operations (upload/delete/download) will be gated by permission checks at the application level (Server Actions) rather than storage RLS.

---

### Features: Attachments (Types, Hooks, Actions, Components)

#### [NEW] `src/features/attachments/types/attachment.ts`
- Define `TaskAttachment` interface reflecting the database schema.
- Define specific upload payload types.

#### [NEW] `src/features/attachments/actions/upload-attachment.ts`
- Server Action: Takes the uploaded file metadata and inserts a record into `task_attachments` after it's successfully uploaded to Supabase Storage from the client.
- Adds an entry to the `activities` table noting "User uploaded [file_name]".

#### [NEW] `src/features/attachments/actions/delete-attachment.ts`
- Server Action: Deletes the metadata record from `task_attachments`.
- Deletes the file from the `attachments` Supabase storage bucket.
- Adds an entry to the `activities` table noting "User deleted [file_name]".

#### [NEW] `src/features/attachments/actions/get-task-attachments.ts`
- Server Action: Fetches all attachment records for a given `task_id` ordered by `created_at` descending.
- Generates signed URLs for the attachments if needed, or signed URLs will be generated dynamically on the client depending on caching needs.

#### [NEW] `src/features/attachments/hooks/use-task-attachments.ts`
- React Query hook: Fetches attachments and manages cache invalidation.

#### [NEW] `src/features/attachments/hooks/use-upload-attachment.ts`
- React Query mutation hook: Handles the file upload to Supabase Storage (tracking progress) and subsequently calls the `upload-attachment` Server Action. Uses optimistic updates where possible.

#### [NEW] `src/features/attachments/hooks/use-delete-attachment.ts`
- React Query mutation hook: Calls the `delete-attachment` Server Action and provides optimistic UI removal.

#### [NEW] `src/features/attachments/components/AttachmentList.tsx`
- Renders the list of `AttachmentItem`s or an empty state.
- Handles the loading states and the integration with React Query.

#### [NEW] `src/features/attachments/components/AttachmentItem.tsx`
- Displays individual file info (MIME type icon, name, size, uploader, date).
- Handles Download and Delete user interactions, including the delete confirmation dialog.

#### [NEW] `src/features/attachments/components/AttachmentUpload.tsx`
- Renders the drag-and-drop zone and file picker button.
- Handles client-side file size validation (Max 20MB).
- Manages upload progress visual state.

---

### Integration: Tasks Feature

#### [MODIFY] `src/features/tasks/components/modals/task-details-modal.tsx`
- Import and render `AttachmentUpload` and `AttachmentList` within the modal content area.

---

## Verification Plan

### Automated Tests
- If applicable, run linter and TypeScript compiler checks `npm run lint` and `npm run typecheck` after the code changes are made.

### Manual Verification
- **Upload Flow:** Drag and drop a valid file (< 20MB) and verify the upload progress indicator appears and the file subsequently appears in the list.
- **Validation:** Attempt to upload a file > 20MB and verify an appropriate error message is shown.
- **View Flow:** Verify the file appears in the Supabase Storage bucket and the metadata is present in `task_attachments`.
- **Download Flow:** Click the attachment name/icon and verify it opens the signed URL in a new tab or triggers a download.
- **Delete Flow:** Delete the file and verify it disappears instantly (optimistic UI), is removed from the database, and is removed from the storage bucket.
- **Activity Feed:** Verify the "User uploaded..." and "User deleted..." activities populate correctly in the activity feed section.
- **Permissions:** Verify another user who is NOT an admin cannot delete a file they didn't upload.
