import { describe, it, expect } from "vitest";
import { CreateProjectSchema } from "../src/lib/validations/project.schema";

describe("Project Validation", () => {
  const validData = {
    workspaceId: "123e4567-e89b-12d3-a456-426614174000",
    name: "Valid Project",
  };

  it("accepts a valid project", () => {
    expect(CreateProjectSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects an empty project name", () => {
    expect(CreateProjectSchema.safeParse({ ...validData, name: "" }).success).toBe(false);
  });

  it("rejects a project name exceeding limit", () => {
    expect(CreateProjectSchema.safeParse({ ...validData, name: "a".repeat(101) }).success).toBe(false);
  });
});
