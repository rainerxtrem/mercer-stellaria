import { prisma } from "@/lib/prisma";
import { getStorageRoot } from "@/lib/storage-paths";
import { requireRole } from "@/lib/server-auth";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

const deleteSchema = z.object({
  documentId: z.string().uuid(),
});

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

export async function DELETE(request: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const document = await prisma.generatedDocument.findUnique({
    where: { id: parsed.data.documentId },
    select: {
      id: true,
      documentNumber: true,
      title: true,
      pdfUrl: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  await prisma.generatedDocument.delete({ where: { id: document.id } });

  if (document.pdfUrl.startsWith("/storage/")) {
    const relativePath = document.pdfUrl.slice("/storage/".length);
    const storageRoot = getStorageRoot();
    const absolutePath = path.join(storageRoot, relativePath);

    try {
      await unlink(absolutePath);
    } catch {
      // File may already be missing; DB deletion should still succeed.
    }
  }

  await writeAuditLogSafe({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: "DOCUMENT_DELETED",
    entityType: "GeneratedDocument",
    entityId: document.id,
    summary: `Document ${document.documentNumber} supprimé`,
    details: {
      title: document.title,
      pdfUrl: document.pdfUrl,
    },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ success: true });
}
