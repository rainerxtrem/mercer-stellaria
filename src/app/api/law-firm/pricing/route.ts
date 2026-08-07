import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requirePermission("module:law_firm.billing");
  if (!auth.ok) {
    return auth.response;
  }

  const pricing = await prisma.pricingCatalogItem.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      defaultUnitPrice: true,
      currency: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: pricing });
}
