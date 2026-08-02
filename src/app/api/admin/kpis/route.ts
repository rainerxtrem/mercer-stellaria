import { ContractStatus, InvoiceStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireRole("ADMIN");
  if (!authResult.ok) {
    return authResult.response;
  }

  const [paidRevenue, activeContracts, clients, claims] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: InvoiceStatus.PAID },
      _sum: { amount: true },
    }),
    prisma.contract.count({ where: { status: ContractStatus.ACTIVE } }),
    prisma.user.count({ where: { role: UserRole.CLIENT } }),
    prisma.claim.count(),
  ]);

  return NextResponse.json({
    data: {
      revenue: Number(paidRevenue._sum.amount ?? 0),
      activeContracts,
      clients,
      claims,
    },
  });
}
