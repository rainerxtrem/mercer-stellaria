import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const documents = await prisma.generatedDocument.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      documentNumber: true,
      title: true,
      pdfUrl: true,
      signatureMethod: true,
      signedAt: true,
      createdAt: true,
      template: { select: { id: true, name: true, slug: true } },
      client: { select: { id: true, fullName: true, email: true } },
      creator: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json({ data: documents });
}
