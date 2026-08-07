import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasRequiredRole, type AppRole } from "@/lib/rbac";

// Le middleware importe des modules Next runtime : on relit la table déclarée
// plutôt que d'exécuter le module dans l'environnement de test.
const middlewareSource = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");

function parseProtectedRoutes(): Array<{ prefix: string; role: AppRole }> {
  const block = middlewareSource.match(/const protectedRoutes[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!block) {
    throw new Error("protectedRoutes introuvable dans middleware.ts");
  }

  return [...block[1].matchAll(/\{\s*prefix:\s*"([^"]+)",\s*role:\s*"([^"]+)"\s*\}/g)].map((match) => ({
    prefix: match[1],
    role: match[2] as AppRole,
  }));
}

const protectedRoutes = parseProtectedRoutes();

function guardFor(pathname: string) {
  return protectedRoutes.find((entry) => pathname.startsWith(entry.prefix)) ?? null;
}

describe("couverture du middleware", () => {
  it.each([
    ["/law/dashboard", "COLLABORATOR"],
    ["/law/cases", "COLLABORATOR"],
    ["/rh/dashboard", "COLLABORATOR"],
    ["/direction/dashboard", "ADMIN"],
    ["/direction/audit", "ADMIN"],
    ["/finance/dashboard", "ADMIN"],
    ["/assurance/dashboard", "CLIENT"],
    ["/investment/dashboard", "CLIENT"],
    ["/investment/portfolio", "CLIENT"],
    ["/client-space/overview", "CLIENT"],
    ["/admin", "ADMIN"],
    ["/collaborateur", "COLLABORATOR"],
  ])("protège %s au niveau %s", (pathname, expectedRole) => {
    const guard = guardFor(pathname);
    expect(guard, `${pathname} n'est protégé par aucune règle`).not.toBeNull();
    expect(guard!.role).toBe(expectedRole);
  });

  it.each(["/", "/connexion", "/inscription", "/cgu", "/mentions-legales", "/assurances", "/cabinet", "/investment"])(
    "laisse %s publique",
    (pathname) => {
      expect(guardFor(pathname)).toBeNull();
    },
  );

  it("protège toutes les API métier", () => {
    for (const api of ["/api/contracts", "/api/claims", "/api/invoices", "/api/law-firm/matters", "/api/admin/audit", "/api/clients"]) {
      expect(guardFor(api), `${api} est exposée`).not.toBeNull();
    }
  });
});

describe("application des rôles sur les routes protégées", () => {
  it("interdit à un client les espaces staff", () => {
    for (const pathname of ["/law/dashboard", "/rh/dashboard", "/direction/dashboard", "/admin"]) {
      const guard = guardFor(pathname)!;
      expect(hasRequiredRole("CLIENT", guard.role)).toBe(false);
    }
  });

  it("interdit à un collaborateur les espaces direction", () => {
    for (const pathname of ["/direction/dashboard", "/finance/dashboard", "/admin"]) {
      const guard = guardFor(pathname)!;
      expect(hasRequiredRole("COLLABORATOR", guard.role)).toBe(false);
    }
  });

  it("autorise le collaborateur sur ses propres espaces", () => {
    for (const pathname of ["/law/dashboard", "/rh/dashboard", "/collaborateur"]) {
      const guard = guardFor(pathname)!;
      expect(hasRequiredRole("COLLABORATOR", guard.role)).toBe(true);
    }
  });

  it("interdit tout accès anonyme aux routes protégées", () => {
    for (const route of protectedRoutes) {
      expect(hasRequiredRole("PUBLIC", route.role), `${route.prefix} accessible en anonyme`).toBe(false);
    }
  });
});
