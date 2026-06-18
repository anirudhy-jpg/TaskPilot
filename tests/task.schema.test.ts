import { describe, it, expect } from "vitest";
import { CreateTaskSchema } from "../src/lib/validations/task.schema";

describe("Task Validation", () => {
  const validData = {
    title: "Valid Task",
    projectId: "123e4567-e89b-12d3-a456-426614174000",
    columnId: "123e4567-e89b-12d3-a456-426614174000",
    priority: "low",
    type: "feature",
  };

  it("accepts a valid task", () => {
    expect(CreateTaskSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts a task without type (defaults to task)", () => {
    const dataWithoutType = {
      title: validData.title,
      projectId: validData.projectId,
      columnId: validData.columnId,
      priority: validData.priority,
    };
    const parsed = CreateTaskSchema.safeParse(dataWithoutType);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("task");
    }
  });

  it("rejects an empty task title", () => {
    expect(CreateTaskSchema.safeParse({ ...validData, title: "" }).success).toBe(false);
  });

  it("rejects a title exceeding max length", () => {
    expect(CreateTaskSchema.safeParse({ ...validData, title: "a".repeat(201) }).success).toBe(false);
  });

  it("rejects an invalid priority", () => {
    expect(CreateTaskSchema.safeParse({ ...validData, priority: "invalid" }).success).toBe(false);
  });

  it("rejects an invalid type", () => {
    expect(CreateTaskSchema.safeParse({ ...validData, type: "invalid" }).success).toBe(false);
  });

  it("rejects an invalid UUID for projectId", () => {
    expect(CreateTaskSchema.safeParse({ ...validData, projectId: "invalid-uuid" }).success).toBe(false);
  });
});
