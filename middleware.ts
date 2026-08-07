import { hasRequiredRole, AppRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes: Array<{ prefix: string; role: AppRole }> = [
  { prefix: "/client", role: "CLIENT" },
  { prefix: "/investment/dashboard", role: "CLIENT" },
  { prefix: "/investment/portfolio", role: "CLIENT" },
  { prefix: "/investment/analytics", role: "CLIENT" },
  { prefix: "/investment/requests", role: "CLIENT" },
  { prefix: "/investment/profile", role: "CLIENT" },
  { prefix: "/assurances/dashboard", role: "CLIENT" },
  { prefix: "/assurance/", role: "CLIENT" },
  { prefix: "/collaborateur", role: "COLLABORATOR" },
  { prefix: "/cabinet/espace", role: "COLLABORATOR" },
  { prefix: "/law/", role: "COLLABORATOR" },
  { prefix: "/rh/", role: "COLLABORATOR" },
  { prefix: "/direction/", role: "ADMIN" },
  { prefix: "/finance/", role: "ADMIN" },
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/api/clients", role: "COLLABORATOR" },
  { prefix: "/api/contracts", role: "CLIENT" },
  { prefix: "/api/invoices", role: "CLIENT" },
  { prefix: "/api/claims", role: "CLIENT" },
  { prefix: "/api/contact", role: "CLIENT" },
  { prefix: "/api/notifications", role: "CLIENT" },
  { prefix: "/api/admin/document-templates", role: "COLLABORATOR" },
  { prefix: "/api/admin/generated-documents", role: "COLLABORATOR" },
  { prefix: "/api/law-firm", role: "COLLABORATOR" },
  { prefix: "/api/admin", role: "ADMIN" },
];

type TokenRouteRule = {
  pattern: string;
  matchType: "EXACT" | "PREFIX" | "REGEXP";
  permissionKey: string;
};

function matchesRouteRule(pathname: string, rule: TokenRouteRule) {
  if (rule.matchType === "EXACT") {
    return pathname === rule.pattern;
  }

  if (rule.matchType === "PREFIX") {
    return pathname.startsWith(rule.pattern);
  }

  if (rule.matchType === "REGEXP") {
    try {
      return new RegExp(rule.pattern).test(pathname);
    } catch {
      return false;
    }
  }

  return false;
}

function getRulePriority(rule: TokenRouteRule) {
  const matchTypeWeight = rule.matchType === "EXACT" ? 3 : rule.matchType === "PREFIX" ? 2 : 1;
  return matchTypeWeight * 10_000 + rule.pattern.length;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const shareToken = request.nextUrl.searchParams.get("share");

  // Public access is allowed for secure signature links. The token is validated in the API route.
  if (shareToken && (pathname.startsWith("/cabinet/espace/signature/") || pathname.startsWith("/api/law-firm/invoices/"))) {
    if (pathname.endsWith("/sign") || pathname.startsWith("/cabinet/espace/signature/")) {
      return NextResponse.next();
    }
  }

  const routeGuard = protectedRoutes.find((entry) => pathname.startsWith(entry.prefix));

  if (!routeGuard) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (token.role as AppRole) ?? "PUBLIC";
  const permissionKeys = Array.isArray(token.permissions) ? token.permissions.filter((key): key is string => typeof key === "string") : [];
  const routeRules = Array.isArray(token.permissionRouteRules)
    ? token.permissionRouteRules.filter(
        (rule): rule is TokenRouteRule =>
          Boolean(rule) &&
          typeof rule === "object" &&
          typeof (rule as TokenRouteRule).pattern === "string" &&
          typeof (rule as TokenRouteRule).matchType === "string" &&
          typeof (rule as TokenRouteRule).permissionKey === "string",
      )
    : [];

  const dynamicRule = routeRules
    .filter((rule) => matchesRouteRule(pathname, rule))
    .sort((a, b) => getRulePriority(b) - getRulePriority(a))[0];
  const hasDynamicAccess = !dynamicRule || permissionKeys.includes("*") || permissionKeys.includes(dynamicRule.permissionKey);
  const profileCompleted = Boolean(token.profileCompleted);

  const isClientArea = pathname.startsWith("/client") || pathname.startsWith("/investment/dashboard") || pathname.startsWith("/assurances/dashboard") || pathname.startsWith("/api/contracts") || pathname.startsWith("/api/invoices") || pathname.startsWith("/api/claims") || pathname.startsWith("/api/contact") || pathname.startsWith("/api/notifications") || pathname.startsWith("/api/subscription-requests");

  if (!profileCompleted && userRole === "CLIENT" && isClientArea) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Profile onboarding is required." }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/inscription/profil", request.url));
  }

  if (!hasRequiredRole(userRole, routeGuard.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!hasDynamicAccess) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
