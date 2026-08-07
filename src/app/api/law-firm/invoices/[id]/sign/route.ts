import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

async function ensureInvoiceTemplate(userId: string) {
  const slug = "law-firm-invoice-template";
  const existing = await prisma.documentTemplate.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return existing;
  }

  return prisma.documentTemplate.create({
    data: {
      name: "Facture Law Firm",
      slug,
      description: "Template système pour la traçabilité des factures Law Firm.",
      content: "Document de facturation Law Firm",
      isActive: true,
      createdById: userId,
      updatedById: userId,
    },
    select: { id: true },
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("feature:law_firm.signature");
  const shareToken = request.nextUrl.searchParams.get("share");
  const user = await getCurrentUser();

  if (!auth.ok && !shareToken) {
    return auth.response;
  }

  if (!user && !shareToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await prisma.lawInvoice.findUnique({ where: { id }, include: { matter: true, client: true } });

  if (!invoice) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  if (!auth.ok && shareToken) {
    const tokenHash = createHash("sha256").update(shareToken).digest("hex");
    const isValid = invoice.shareTokenHash === tokenHash && (!invoice.shareTokenExpiresAt || invoice.shareTokenExpiresAt > new Date());
    if (!isValid) {
      return NextResponse.json({ error: "Lien de signature invalide ou expiré." }, { status: 403 });
    }
  }

  const actorId = user?.id ?? invoice.clientId;
  const actorRole = user?.role ?? invoice.client.role;
  const actorName = user?.email ?? invoice.client.email ?? "Client";

  const signed = await prisma.lawInvoice.update({
    where: { id: invoice.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      updatedById: actorId,
    },
  });

  const template = await ensureInvoiceTemplate(invoice.createdById);
  const pdfUrl = signed.pdfUrl ?? `/api/law-firm/invoices/${invoice.id}/pdf`;
  await prisma.generatedDocument.upsert({
    where: { documentNumber: invoice.invoiceNumber },
    update: {
      title: `Facture ${invoice.invoiceNumber}`,
      templateId: template.id,
      clientId: invoice.clientId,
      matterId: invoice.matterId,
      pdfUrl,
      signedAt: signed.signedAt,
      payloadSnapshot: {
        source: "LAW_INVOICE",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: signed.status,
      },
    },
    create: {
      documentNumber: invoice.invoiceNumber,
      title: `Facture ${invoice.invoiceNumber}`,
      templateId: template.id,
      clientId: invoice.clientId,
      matterId: invoice.matterId,
      contentSnapshot: `Facture ${invoice.invoiceNumber} signée`,
      payloadSnapshot: {
        source: "LAW_INVOICE",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: signed.status,
      },
      pdfUrl,
      signedAt: signed.signedAt,
      createdById: invoice.createdById,
    },
  });

  await prisma.lawMatterMessage.create({
    data: {
      matterId: invoice.matterId,
      senderId: actorId,
      senderRole: actorRole as never,
      senderName: actorName,
      body: `Signature confirmée pour ${invoice.invoiceNumber}.`,
      documentLink: invoice.pdfUrl ?? undefined,
      signatureLink: `/cabinet/espace/signature/${invoice.id}`,
    },
  });

  await prisma.lawMatter.update({ where: { id: invoice.matterId }, data: { lastActivityAt: new Date() } });

  await createAppNotificationSafe({
    recipientId: invoice.createdById,
    type: NotificationType.CONTRACT,
    severity: NotificationSeverity.SUCCESS,
    title: `${invoice.invoiceNumber} signé`,
    body: `Le document ${invoice.invoiceNumber} a été signé.`,
    link: `/cabinet/espace`,
  });

  return NextResponse.json({ data: signed });
}
