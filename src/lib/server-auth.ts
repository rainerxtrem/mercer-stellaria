import { authOptions } from "@/auth";
import { NextResponse } from "next/server";
import { AppRole, hasRequiredRole } from "@/lib/rbac";
import { getServerSession } from "next-auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    role: (session.user.role as AppRole) ?? "PUBLIC",
    email: session.user.email ?? null,
  };
}

export async function requireRole(requiredRole: AppRole) {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!hasRequiredRole(user.role, requiredRole)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, user };
}
