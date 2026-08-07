import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.documents");
  if (!auth.ok) {
    return auth.response;
  }

  const matterId = request.nextUrl.searchParams.get("matterId") ?? undefined;
  const documents = await prisma.generatedDocument.findMany({
    where: matterId ? { matterId } : { matterId: { not: null } },
    include: {
      matter: { select: { id: true, matterNumber: true, title: true } },
      client: { select: { id: true, fullName: true, email: true } },
      creator: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: documents });
}
