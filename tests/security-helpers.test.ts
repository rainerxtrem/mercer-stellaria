import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/grade-permissions";
import { optionalHttpUrlSchema } from "@/lib/url-validation";

describe("hasPermission", () => {
  it("accepts the wildcard", () => {
    expect(hasPermission(["*"], "module:law_firm.cases")).toBe(true);
  });

  it("accepts an exact permission", () => {
    expect(hasPermission(["module:law_firm.cases"], "module:law_firm.cases")).toBe(true);
  });

  it("refuses a missing permission", () => {
    expect(hasPermission(["space:client"], "module:law_firm.cases")).toBe(false);
    expect(hasPermission([], "space:direction")).toBe(false);
  });
});

describe("optionalHttpUrlSchema", () => {
  it("accepts empty values", () => {
    expect(optionalHttpUrlSchema.safeParse("").success).toBe(true);
    expect(optionalHttpUrlSchema.safeParse(undefined).success).toBe(true);
  });

  it("accepts http(s) links", () => {
    expect(optionalHttpUrlSchema.safeParse("https://example.com/proof.pdf").success).toBe(true);
  });

  it("rejects dangerous schemes", () => {
    expect(optionalHttpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(optionalHttpUrlSchema.safeParse("data:text/html,<script>").success).toBe(false);
  });
});
