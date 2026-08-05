import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireRole("ADMIN");
  if (!authResult.ok) {
    return authResult.response;
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      createdAt: true,
      actorRole: true,
      actor: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({ data: logs });
}
