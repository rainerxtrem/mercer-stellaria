import { NotificationSeverity, NotificationType, SignatureMethod } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { buildHtmlPreviewDocument, isHtmlTemplate, renderTemplateContent } from "@/lib/document-templates";
import { buildNumber } from "@/lib/ids";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { getStorageRoot } from "@/lib/storage-paths";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const generateSchema = z
  .object({
    templateId: z.string().uuid(),
    title: z.string().min(3).max(160),
    payload: z.record(z.string(), z.unknown()).default({}),
    clientId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    signatureMethod: z.enum([SignatureMethod.CERTIFIED_CLICK, SignatureMethod.DRAWN_CANVAS]).optional(),
    signatureData: z.string().optional(),
  })
  .refine((data) => data.signatureMethod !== SignatureMethod.DRAWN_CANVAS || Boolean(data.signatureData), {
    message: "Signature dessinée requise pour le mode canvas.",
    path: ["signatureData"],
  });

export async function POST(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const template = await prisma.documentTemplate.findUnique({
    where: { id: parsed.data.templateId },
    select: { id: true, name: true, slug: true, content: true, isActive: true },
  });

  if (!template) {
    return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  }

  if (!template.isActive) {
    return NextResponse.json({ error: "Ce modèle est inactif." }, { status: 409 });
  }

  if (parsed.data.clientId) {
    const targetClient = await prisma.user.findUnique({ where: { id: parsed.data.clientId }, select: { id: true } });
    if (!targetClient) {
      return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    }
  }

  if (parsed.data.contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: parsed.data.contractId }, select: { id: true } });
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }
  }

  const documentNumber = buildNumber("DOC");
  const renderedContent = renderTemplateContent(template.content, parsed.data.payload);
  const payloadSnapshot = parsed.data.payload as Prisma.InputJsonValue;
  let pdfUrl = "";

  if (isHtmlTemplate(renderedContent)) {
    // Save HTML documents with full styling preserved
    const htmlDocument = buildHtmlPreviewDocument(renderedContent, parsed.data.title);
    const outputDirectory = path.join(getStorageRoot(), "documents");
    await mkdir(outputDirectory, { recursive: true });

    const fileName = `${documentNumber}.html`;
    const filePath = path.join(outputDirectory, fileName);
    await writeFile(filePath, htmlDocument, "utf-8");
    pdfUrl = `/storage/documents/${fileName}`;
  } else {
    // Generate PDF for text-based templates
    const { generateTemplatePdf } = await import("@/lib/document-templates");
    pdfUrl = await generateTemplatePdf({
      documentNumber,
      title: parsed.data.title,
      content: renderedContent,
      signatureMethod: parsed.data.signatureMethod,
      signatureData: parsed.data.signatureData,
    });
  }

  const generated = await prisma.generatedDocument.create({
    data: {
      documentNumber,
      title: parsed.data.title,
      templateId: template.id,
      clientId: parsed.data.clientId,
      contractId: parsed.data.contractId,
      contentSnapshot: renderedContent,
      payloadSnapshot,
      signatureMethod: parsed.data.signatureMethod,
      signatureData: parsed.data.signatureData ?? null,
      signedAt: parsed.data.signatureMethod ? new Date() : null,
      pdfUrl,
      createdById: auth.user.id,
    },
  });

  if (parsed.data.clientId) {
    await createAppNotificationSafe({
      recipientId: parsed.data.clientId,
      type: NotificationType.CONTRACT,
      severity: NotificationSeverity.INFO,
      title: "Nouveau document disponible",
      body: `Un document (${parsed.data.title}) a été généré par la direction.`,
      link: "/client",
    });
  }

  await writeAuditLogSafe({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: "DOCUMENT_GENERATED",
    entityType: "GeneratedDocument",
    entityId: generated.id,
    summary: `Document ${documentNumber} généré depuis ${template.slug}`,
    details: {
      templateId: template.id,
      clientId: parsed.data.clientId,
      contractId: parsed.data.contractId,
      signatureMethod: parsed.data.signatureMethod,
    },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: generated }, { status: 201 });
}
