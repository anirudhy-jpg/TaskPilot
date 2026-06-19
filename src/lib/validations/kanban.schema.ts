import { z } from "zod";

export const CreateColumnSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
});
export type CreateColumnInput = z.infer<typeof CreateColumnSchema>;

export const UpdateColumnNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
});
export type UpdateColumnNameInput = z.infer<typeof UpdateColumnNameSchema>;
