import { hasRequiredRole, AppRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes: Array<{ prefix: string; role: AppRole }> = [
  { prefix: "/client", role: "CLIENT" },
  { prefix: "/investment", role: "CLIENT" },
  { prefix: "/assurances/dashboard", role: "CLIENT" },
  { prefix: "/collaborateur", role: "COLLABORATOR" },
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/api/clients", role: "COLLABORATOR" },
  { prefix: "/api/contracts", role: "CLIENT" },
  { prefix: "/api/invoices", role: "CLIENT" },
  { prefix: "/api/claims", role: "CLIENT" },
  { prefix: "/api/contact", role: "CLIENT" },
  { prefix: "/api/notifications", role: "CLIENT" },
  { prefix: "/api/admin", role: "ADMIN" },
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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
  const profileCompleted = Boolean(token.profileCompleted);

  const isClientArea = pathname.startsWith("/client") || pathname.startsWith("/investment") || pathname.startsWith("/api/contracts") || pathname.startsWith("/api/invoices") || pathname.startsWith("/api/claims") || pathname.startsWith("/api/contact") || pathname.startsWith("/api/notifications") || pathname.startsWith("/api/subscription-requests");

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/client/:path*", "/investment/:path*", "/assurances/dashboard/:path*", "/collaborateur/:path*", "/admin/:path*", "/api/:path*"],
};
