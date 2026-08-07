import { describe, expect, it } from "vitest";
import { getDefaultSpaceForRole, hasRequiredRole } from "@/lib/rbac";

describe("hasRequiredRole", () => {
  it("grants access when the role matches exactly", () => {
    expect(hasRequiredRole("CLIENT", "CLIENT")).toBe(true);
    expect(hasRequiredRole("ADMIN", "ADMIN")).toBe(true);
  });

  it("respects the hierarchy upwards", () => {
    expect(hasRequiredRole("ADMIN", "COLLABORATOR")).toBe(true);
    expect(hasRequiredRole("ADMIN", "CLIENT")).toBe(true);
    expect(hasRequiredRole("COLLABORATOR", "CLIENT")).toBe(true);
  });

  it("denies privilege escalation", () => {
    expect(hasRequiredRole("CLIENT", "COLLABORATOR")).toBe(false);
    expect(hasRequiredRole("CLIENT", "ADMIN")).toBe(false);
    expect(hasRequiredRole("COLLABORATOR", "ADMIN")).toBe(false);
    expect(hasRequiredRole("PUBLIC", "CLIENT")).toBe(false);
  });

  it("denies everything above PUBLIC for anonymous users", () => {
    expect(hasRequiredRole("PUBLIC", "COLLABORATOR")).toBe(false);
    expect(hasRequiredRole("PUBLIC", "ADMIN")).toBe(false);
  });
});

describe("getDefaultSpaceForRole", () => {
  it("routes each role to its own landing space", () => {
    expect(getDefaultSpaceForRole("ADMIN")).toBe("/admin");
    expect(getDefaultSpaceForRole("COLLABORATOR")).toBe("/collaborateur");
    expect(getDefaultSpaceForRole("CLIENT")).toBe("/client");
  });
});
