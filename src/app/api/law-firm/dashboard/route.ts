import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requirePermission("space:law_firm");
  if (!auth.ok) {
    return auth.response;
  }

  const now = new Date();
  const [activeMatters, pendingMatters, onHoldMatters, closedMatters, overdueMatters, pendingQuotes, pendingInvoices, unpaidInvoices, documentsToSign, openTasks, upcomingAgenda, recentActivity] = await Promise.all([
    prisma.lawMatter.count({ where: { isArchived: false, status: "IN_PROGRESS" } }),
    prisma.lawMatter.count({ where: { isArchived: false, status: "PENDING" } }),
    prisma.lawMatter.count({ where: { isArchived: false, status: "HOLD" } }),
    prisma.lawMatter.count({ where: { isArchived: true, status: "CLOSED" } }),
    prisma.lawMatterTask.count({ where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueDate: { lt: now } } }),
    prisma.lawInvoice.count({ where: { status: "DRAFT" } }),
    prisma.lawInvoice.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
    prisma.lawInvoice.count({ where: { status: { in: ["SENT", "EXPIRED", "BILLED"] } } }),
    prisma.generatedDocument.count({ where: { matterId: { not: null }, signedAt: null } }),
    prisma.lawMatterTask.count({ where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } } }),
    prisma.lawMatterTask.findMany({
      where: { dueDate: { not: null }, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
      include: { matter: { select: { id: true, matterNumber: true, title: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.$queryRaw<Array<{ kind: string; id: string; title: string; updatedAt: Date }>>`
      SELECT 'matter' as kind, id, title, updatedAt FROM LawMatter
      UNION ALL
      SELECT 'invoice' as kind, id, invoiceNumber as title, updatedAt FROM LawInvoice
      ORDER BY updatedAt DESC
      LIMIT 10
    `,
  ]);

  return NextResponse.json({
    data: {
      metrics: {
        activeMatters,
        pendingMatters,
        onHoldMatters,
        closedMatters,
        overdueMatters,
        pendingQuotes,
        pendingInvoices,
        unpaidInvoices,
        documentsToSign,
        openTasks,
      },
      agenda: upcomingAgenda,
      recentActivity,
    },
  });
}
