import { InvoiceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const invoiceActionSchema = z.object({
  invoiceId: z.string().uuid(),
  action: z.enum(["mark_paid", "mark_late", "send_reminder"]),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    user.role === "ADMIN"
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

  return NextResponse.json({ data: updated });
}
