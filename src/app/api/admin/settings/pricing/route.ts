import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_.-]+$/),
  name: z.string().min(2).max(140),
  description: z.string().max(600).optional().nullable(),
  defaultUnitPrice: z.number().nonnegative(),
  currency: z.string().min(3).max(5).default("EUR"),
  isActive: z.boolean().default(true),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_.-]+$/).optional(),
  name: z.string().min(2).max(140).optional(),
  description: z.string().max(600).optional().nullable(),
  defaultUnitPrice: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(5).optional(),
  isActive: z.boolean().optional(),
  action: z.enum(["update", "delete"]).optional(),
});

export async function GET() {
  const auth = await requirePermission("module:settings.pricing");
  if (!auth.ok) {
    return auth.response;
  }

  const items = await prisma.pricingCatalogItem.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
      updatedBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("module:settings.pricing");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.pricingCatalogItem.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      defaultUnitPrice: parsed.data.defaultUnitPrice,
      currency: parsed.data.currency,
      isActive: parsed.data.isActive,
      createdById: auth.user.id,
      updatedById: auth.user.id,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("module:settings.pricing");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "delete") {
    await prisma.pricingCatalogItem.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ success: true });
  }

  const updated = await prisma.pricingCatalogItem.update({
    where: { id: parsed.data.id },
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description,
      defaultUnitPrice: parsed.data.defaultUnitPrice,
      currency: parsed.data.currency,
      isActive: parsed.data.isActive,
      updatedById: auth.user.id,
    },
  });

  return NextResponse.json({ data: updated });
}
