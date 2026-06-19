import { describe, it, expect } from "vitest";
import { CreateColumnSchema } from "../src/lib/validations/kanban.schema";

describe("Kanban Column Validation", () => {
  const validData = {
    projectId: "123e4567-e89b-12d3-a456-426614174000",
    name: "Valid Column",
  };

  it("accepts a valid column", () => {
    expect(CreateColumnSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects an empty column name", () => {
    expect(CreateColumnSchema.safeParse({ ...validData, name: "" }).success).toBe(false);
  });

  it("rejects a column name exceeding limit", () => {
    expect(CreateColumnSchema.safeParse({ ...validData, name: "a".repeat(51) }).success).toBe(false);
  });
});
