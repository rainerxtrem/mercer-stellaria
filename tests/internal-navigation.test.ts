import { describe, expect, it } from "vitest";
import {
  INTERNAL_SPACES,
  getImplementedModules,
  isInternalPath,
  isSpaceImplemented,
  resolveAccessibleSpaces,
} from "@/lib/internal-navigation";

describe("isInternalPath", () => {
  it("recognises internal spaces", () => {
    expect(isInternalPath("/law/dashboard")).toBe(true);
    expect(isInternalPath("/client-space/overview")).toBe(true);
    expect(isInternalPath("/direction/audit")).toBe(true);
  });

  it("leaves marketing pages public", () => {
    expect(isInternalPath("/")).toBe(false);
    expect(isInternalPath("/connexion")).toBe(false);
    expect(isInternalPath("/cgu")).toBe(false);
  });
});

describe("unimplemented modules are hidden", () => {
  it("never exposes the Finance space", () => {
    const finance = INTERNAL_SPACES.find((space) => space.id === "finance");
    expect(finance).toBeDefined();
    expect(isSpaceImplemented(finance!)).toBe(false);

    const spaces = resolveAccessibleSpaces({ permissions: ["*"], role: "ADMIN", pathname: "/direction/dashboard" });
    expect(spaces.some((space) => space.id === "finance")).toBe(false);
  });

  it("keeps only the implemented Investment modules", () => {
    const investment = INTERNAL_SPACES.find((space) => space.id === "investment")!;
    const ids = getImplementedModules(investment).map((module) => module.id);
    expect(ids).toEqual(["dashboard"]);
  });

  it("keeps only the implemented Assurance modules", () => {
    const assurance = INTERNAL_SPACES.find((space) => space.id === "assurance")!;
    const ids = getImplementedModules(assurance).map((module) => module.id);
    expect(ids).toEqual(["dashboard"]);
  });

  it("keeps every client module available", () => {
    const client = INTERNAL_SPACES.find((space) => space.id === "client")!;
    expect(getImplementedModules(client)).toHaveLength(client.modules.length);
  });
});

describe("resolveAccessibleSpaces", () => {
  it("returns nothing for anonymous visitors on a public page", () => {
    expect(resolveAccessibleSpaces({ permissions: [], role: "PUBLIC", pathname: "/" })).toHaveLength(0);
  });

  it("does not expose staff spaces to a client", () => {
    const spaces = resolveAccessibleSpaces({ permissions: ["space:client"], role: "CLIENT", pathname: "/client-space/overview" });
    const ids = spaces.map((space) => space.id);
    expect(ids).not.toContain("direction");
    expect(ids).not.toContain("law_firm");
    expect(ids).not.toContain("collaborateur");
  });
});
