import { z } from "zod";

export const TaskPriorityEnum = z.enum(["low", "medium", "high"]);
export const TaskTypeEnum = z.enum(["task", "feature", "bug", "enhancement"]);

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional(),
  projectId: z.string().uuid("Invalid project ID"),
  columnId: z.string().uuid("Invalid column ID"),
  priority: TaskPriorityEnum.optional(),
  type: TaskTypeEnum.optional().default("task"),
  assigneeId: z.string().uuid("Invalid assignee ID").optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long").optional(),
  description: z.string().nullable().optional(),
  priority: TaskPriorityEnum.optional(),
  type: TaskTypeEnum.optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const MoveTaskSchema = z.object({
  columnId: z.string().uuid("Invalid column ID"),
  position: z.number().min(0),
});
export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;

export const AddCommentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  mentionedUserIds: z.array(z.string().uuid("Invalid user ID")).optional().default([]),
});
export type AddCommentInput = z.infer<typeof AddCommentSchema>;

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, "Content is required"),
});
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
