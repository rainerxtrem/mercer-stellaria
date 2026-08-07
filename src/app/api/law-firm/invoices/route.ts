import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { buildChronologicalNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const lineSchema = z.object({
  description: z.string().min(2),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).max(100).optional().default(0),
});

const createInvoiceSchema = z.object({
  matterId: z.string().uuid(),
  clientId: z.string().uuid(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
  notes: z.string().optional(),
});

const updateInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  action: z.enum(["update", "duplicate", "archive", "delete", "send", "mark_paid", "mark_billed", "expire"]),
  matterId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

function computeTotals(lines: Array<z.infer<typeof lineSchema>>) {
  const subtotal = lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
  const discountTotal = lines.reduce((total, line) => total + (line.quantity * line.unitPrice * line.discount) / 100, 0);
  const taxTotal = 0;
  const total = subtotal - discountTotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total };
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.billing");
  if (!auth.ok) {
    return auth.response;
  }

  const search = (request.nextUrl.searchParams.get("search") ?? "").trim();

  const invoices = await prisma.lawInvoice.findMany({
    where: {
      OR: search
        ? [
            { invoiceNumber: { contains: search } },
            { matter: { title: { contains: search } } },
            { client: { fullName: { contains: search } } },
          ]
        : undefined,
    },
    include: {
      matter: { select: { id: true, matterNumber: true, title: true, status: true } },
      client: { select: { id: true, fullName: true, email: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      updatedBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  return NextResponse.json({ data: invoices });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.billing");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const matter = await prisma.lawMatter.findUnique({
    where: { id: parsed.data.matterId },
    select: { id: true, clientId: true, title: true },
  });

  if (!matter) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  const client = await prisma.user.findFirst({
    where: { id: parsed.data.clientId },
    select: { id: true, fullName: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const totals = computeTotals(parsed.data.lines);

  const invoice = await prisma.lawInvoice.create({
    data: {
      invoiceNumber: await buildChronologicalNumber("FAC", "law_invoice"),
      matterId: matter.id,
      clientId: client.id,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: "DRAFT",
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      createdById: auth.user.id,
      updatedById: auth.user.id,
      lines: {
        create: parsed.data.lines.map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount ?? 0,
          sortOrder: index,
          lineTotal: line.quantity * line.unitPrice * (1 - (line.discount ?? 0) / 100),
        })),
      },
    },
    include: {
      matter: { select: { id: true, matterNumber: true, title: true, status: true } },
      client: { select: { id: true, fullName: true, email: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      updatedBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  await prisma.lawMatter.update({ where: { id: matter.id }, data: { lastActivityAt: new Date() } });

  await writeAuditLogSafe({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: "LAW_INVOICE_CREATED",
    entityType: "LawInvoice",
    entityId: invoice.id,
    summary: `Facture ${invoice.invoiceNumber} créée`,
    details: { matterId: matter.id, clientId: client.id, total: invoice.total },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: invoice }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.billing");
  if (!auth.ok) {
    return auth.response;
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const invoice = await prisma.lawInvoice.findUnique({
    where: { id: parsed.data.invoiceId },
    include: { matter: true, lines: true, client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  if (parsed.data.action === "delete") {
    await prisma.lawInvoice.delete({ where: { id: invoice.id } });
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "duplicate") {
    const duplicateNumber = await buildChronologicalNumber("FAC", "law_invoice");
    const duplicated = await prisma.lawInvoice.create({
      data: {
        invoiceNumber: duplicateNumber,
        matterId: parsed.data.matterId ?? invoice.matterId,
        clientId: parsed.data.clientId ?? invoice.clientId,
        issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : invoice.dueDate,
        status: "DRAFT",
        subtotal: invoice.subtotal,
        discountTotal: invoice.discountTotal,
        taxTotal: invoice.taxTotal,
        total: invoice.total,
        createdById: user.id,
        updatedById: user.id,
        lines: { create: invoice.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          sortOrder: line.sortOrder,
          lineTotal: line.lineTotal,
        })) },
      },
      include: {
        matter: { select: { id: true, matterNumber: true, title: true, status: true } },
        client: { select: { id: true, fullName: true, email: true } },
        lines: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        updatedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return NextResponse.json({ data: duplicated }, { status: 201 });
  }

  if (parsed.data.action === "archive") {
    const archived = await prisma.lawInvoice.update({ where: { id: invoice.id }, data: { archivedAt: new Date(), updatedById: user.id } });
    return NextResponse.json({ data: archived });
  }

  const lines = parsed.data.lines ?? invoice.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discount: line.discount,
  }));
  const totals = computeTotals(lines);

  const updated = await prisma.lawInvoice.update({
    where: { id: invoice.id },
    data: {
      matterId: parsed.data.matterId,
      clientId: parsed.data.clientId,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : undefined,
      dueDate: parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status:
        parsed.data.action === "send"
          ? "SENT"
          : parsed.data.action === "mark_paid"
            ? "PAID"
            : parsed.data.action === "mark_billed"
              ? "BILLED"
              : parsed.data.action === "expire"
                ? "EXPIRED"
                : undefined,
      sentAt: parsed.data.action === "send" ? new Date() : undefined,
      paidAt: parsed.data.action === "mark_paid" ? new Date() : undefined,
      canceledAt: parsed.data.action === "expire" ? new Date() : undefined,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      updatedById: user.id,
      lines: parsed.data.lines
        ? {
            deleteMany: {},
            create: parsed.data.lines.map((line, index) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount ?? 0,
              sortOrder: index,
              lineTotal: line.quantity * line.unitPrice * (1 - (line.discount ?? 0) / 100),
            })),
          }
        : undefined,
    },
    include: {
      matter: { select: { id: true, matterNumber: true, title: true, status: true } },
      client: { select: { id: true, fullName: true, email: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      updatedBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (parsed.data.action === "send") {
    await prisma.lawMatterMessage.create({
      data: {
        matterId: invoice.matterId,
        senderId: user.id,
        senderRole: user.role as never,
        senderName: user.email ?? "Direction",
        body: `Nouveau document disponible: ${invoice.invoiceNumber}. Statut: En attente de signature.`,
        documentLink: updated.pdfUrl ?? undefined,
        signatureLink: `/cabinet/espace/signature/${invoice.id}`,
      },
    });

    await createAppNotificationSafe({
      recipientId: invoice.clientId,
      type: NotificationType.CONTRACT,
      severity: NotificationSeverity.INFO,
      title: `${invoice.invoiceNumber} disponible pour signature`,
      body: `Le document ${invoice.invoiceNumber} est en attente de signature.`,
      link: `/cabinet/espace/signature/${invoice.id}`,
    });

    await prisma.lawMatter.update({ where: { id: invoice.matterId }, data: { lastActivityAt: new Date() } });
  }

  return NextResponse.json({ data: updated });
}
