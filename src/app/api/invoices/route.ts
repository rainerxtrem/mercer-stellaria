import { InvoiceStatus, NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const invoiceActionSchema = z.object({
  invoiceId: z.string().uuid(),
  action: z.enum(["mark_paid", "mark_late", "send_reminder"]),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get("scope");
  const forceSelfScope = scope === "self";

  const where =
    forceSelfScope
      ? { clientId: user.id }
      : user.role === "ADMIN"
      ? {}
      : user.role === "COLLABORATOR"
        ? { contract: { agentId: user.id } }
        : { clientId: user.id };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: { select: { id: true, fullName: true, email: true } },
      contract: { select: { id: true, contractNumber: true, formulaName: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ data: invoices });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = invoiceActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
    include: { contract: true, client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const canManage =
    user.role === "ADMIN" ||
    (user.role === "COLLABORATOR" && invoice.contract.agentId === user.id) ||
    (user.role === "CLIENT" && invoice.clientId === user.id && parsed.data.action === "mark_paid");

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let status = invoice.status;
  let paidAt = invoice.paidAt;
  let reminderSentAt = invoice.reminderSentAt;

  if (parsed.data.action === "mark_paid") {
    status = InvoiceStatus.PAID;
    paidAt = new Date();
  }

  if (parsed.data.action === "mark_late") {
    status = InvoiceStatus.LATE;
  }

  if (parsed.data.action === "send_reminder") {
    reminderSentAt = new Date();

    if (process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Rappel de paiement: facture ${invoice.invoiceNumber} pour ${invoice.client.fullName}.`,
        }),
      }).catch(() => null);
    }
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status,
      paidAt,
      reminderSentAt,
    },
  });

  if (parsed.data.action === "mark_paid") {
    await createAppNotificationSafe({
      recipientId: invoice.clientId,
      type: NotificationType.BILLING,
      severity: NotificationSeverity.SUCCESS,
      title: "Facture réglée",
      body: `La facture ${invoice.invoiceNumber} est marquée comme payée.`,
      link: "/client",
    });
  }

  if (parsed.data.action === "mark_late") {
    await createAppNotificationSafe({
      recipientId: invoice.clientId,
      type: NotificationType.BILLING,
      severity: NotificationSeverity.WARNING,
      title: "Facture en retard",
      body: `La facture ${invoice.invoiceNumber} est désormais en retard.`,
      link: "/client",
    });
  }

  if (parsed.data.action === "send_reminder") {
    await createAppNotificationSafe({
      recipientId: invoice.clientId,
      type: NotificationType.BILLING,
      severity: NotificationSeverity.INFO,
      title: "Rappel de paiement",
      body: `Un rappel a été envoyé pour la facture ${invoice.invoiceNumber}.`,
      link: "/client",
    });
  }

  await writeAuditLogSafe({
    actorId: user.id,
    actorRole: user.role,
    action: `INVOICE_${parsed.data.action.toUpperCase()}`,
    entityType: "Invoice",
    entityId: invoice.id,
    summary: `Action ${parsed.data.action} sur facture ${invoice.invoiceNumber}`,
    details: {
      status: updated.status,
      amount: updated.amount,
      dueDate: updated.dueDate.toISOString(),
    },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: updated });
}
