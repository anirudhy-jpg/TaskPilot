import { z } from "zod";

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

export const RenameWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});
export type RenameWorkspaceInput = z.infer<typeof RenameWorkspaceSchema>;

export const CreateInvitationSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  email: z.string().trim().min(1, "Email is required").email("Invalid email address").toLowerCase(),
  role: z.enum(["admin", "member"]),
  projectIds: z.array(z.string().uuid("Invalid project ID")).optional().default([]),
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
