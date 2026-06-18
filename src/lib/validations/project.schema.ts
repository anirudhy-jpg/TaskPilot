import { z } from "zod";

export const CreateProjectSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const AddProjectMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;
