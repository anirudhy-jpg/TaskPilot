import { describe, it, expect } from "vitest";
import { CreateTaskSchema } from "../src/lib/validations/task.schema";

describe("Task Validation", () => {
  const validData = {
    title: "Valid Task",
    projectId: "123e4567-e89b-12d3-a456-426614174000",
    columnId: "123e4567-e89b-12d3-a456-426614174000",
    priority: "low",
  };

  it("accepts a valid task", () => {
    expect(CreateTaskSchema.safeParse(validData).success).toBe(true);
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

  it("rejects an invalid UUID for projectId", () => {
    expect(CreateTaskSchema.safeParse({ ...validData, projectId: "invalid-uuid" }).success).toBe(false);
  });
});
