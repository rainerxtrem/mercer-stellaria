import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("feature:law_firm.signature");
  if (!auth.ok) {
    return auth.response;
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await prisma.lawInvoice.findUnique({ where: { id }, include: { matter: true, client: true } });

  if (!invoice) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const signed = await prisma.lawInvoice.update({
    where: { id: invoice.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      updatedById: user.id,
    },
  });

  await prisma.lawMatterMessage.create({
    data: {
      matterId: invoice.matterId,
      senderId: user.id,
      senderRole: user.role as never,
      senderName: user.email ?? "Client",
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
