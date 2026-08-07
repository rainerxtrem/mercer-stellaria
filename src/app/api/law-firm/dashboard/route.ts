import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requirePermission("space:law_firm");
  if (!auth.ok) {
    return auth.response;
  }

  const [activeMatters, pendingMatters, onHoldMatters, closedMatters, pendingInvoices, unpaidInvoices, documentsToSign, recentActivity] = await Promise.all([
    prisma.lawMatter.count({ where: { isArchived: false, status: "IN_PROGRESS" } }),
    prisma.lawMatter.count({ where: { isArchived: false, status: "PENDING" } }),
    prisma.lawMatter.count({ where: { isArchived: false, status: "HOLD" } }),
    prisma.lawMatter.count({ where: { isArchived: true, status: "CLOSED" } }),
    prisma.lawInvoice.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
    prisma.lawInvoice.count({ where: { status: { in: ["SENT", "EXPIRED", "BILLED"] } } }),
    prisma.generatedDocument.count({ where: { matterId: { not: null }, signedAt: null } }),
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
        pendingInvoices,
        unpaidInvoices,
        documentsToSign,
      },
      recentActivity,
    },
  });
}
