import { describe, it, expect } from "vitest";
import { CreateInvitationSchema } from "../src/lib/validations/workspace.schema";

describe("Invitation Validation", () => {
  const validData = {
    workspaceId: "123e4567-e89b-12d3-a456-426614174000",
    email: "test@example.com",
    role: "member",
  };

  it("accepts a valid invitation", () => {
    expect(CreateInvitationSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(CreateInvitationSchema.safeParse({ ...validData, email: "invalid-email" }).success).toBe(false);
  });

  it("rejects an invalid workspaceId", () => {
    expect(CreateInvitationSchema.safeParse({ ...validData, workspaceId: "invalid-uuid" }).success).toBe(false);
  });
});
