import { describe, it, expect } from "vitest";
import { CreateWorkspaceSchema } from "../src/lib/validations/workspace.schema";

describe("Workspace Validation", () => {
  const validData = {
    name: "Valid Workspace",
  };

  it("accepts a valid workspace", () => {
    expect(CreateWorkspaceSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects an empty workspace name", () => {
    expect(CreateWorkspaceSchema.safeParse({ ...validData, name: "" }).success).toBe(false);
  });

  it("rejects a workspace name exceeding limit", () => {
    expect(CreateWorkspaceSchema.safeParse({ ...validData, name: "a".repeat(101) }).success).toBe(false);
  });
});
