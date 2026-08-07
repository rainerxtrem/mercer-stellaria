import { UserRole } from "@/generated/prisma/enums";
import { buildChronologicalNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const matterStatuses = ["IN_PROGRESS", "PENDING", "HOLD", "CLOSED"] as const;

const createMatterSchema = z.object({
  clientId: z.string().uuid().optional(),
  clientIds: z.array(z.string().uuid()).min(1).optional(),
  title: z.string().min(3).max(160),
  summary: z.string().min(3).max(4000).optional(),
}).refine((data) => Boolean(data.clientId) || Boolean(data.clientIds?.length), {
  message: "Au moins un client doit être sélectionné.",
  path: ["clientIds"],
});

const updateMatterSchema = z.object({
  matterId: z.string().uuid(),
  title: z.string().min(3).max(160).optional(),
  summary: z.string().min(3).max(4000).nullable().optional(),
  status: z.enum(matterStatuses).optional(),
  isArchived: z.boolean().optional(),
  action: z.enum(["rename", "update", "archive", "restore", "delete"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.cases");
  if (!auth.ok) {
    return auth.response;
  }

  const search = (request.nextUrl.searchParams.get("search") ?? "").trim();
  const status = request.nextUrl.searchParams.get("status");
  const archived = request.nextUrl.searchParams.get("archived");
  const normalizedStatus = status && matterStatuses.includes(status as (typeof matterStatuses)[number]) ? (status as (typeof matterStatuses)[number]) : undefined;

  const matters = await prisma.lawMatter.findMany({
    where: {
      isArchived: archived === "1" ? true : archived === "0" ? false : undefined,
      status: normalizedStatus,
      OR: search
        ? [
            { title: { contains: search } },
            { matterNumber: { contains: search } },
            { summary: { contains: search } },
            { client: { fullName: { contains: search } } },
            { client: { email: { contains: search } } },
            { participants: { some: { client: { fullName: { contains: search } } } } },
            { participants: { some: { client: { firstName: { contains: search } } } } },
            { participants: { some: { client: { lastName: { contains: search } } } } },
            { participants: { some: { client: { citizenUniqueId: { contains: search } } } } },
          ]
        : undefined,
    },
    include: {
      client: { select: { id: true, fullName: true, email: true, phone: true } },
      participants: {
        select: {
          client: { select: { id: true, fullName: true, firstName: true, lastName: true, email: true, citizenUniqueId: true } },
        },
      },
      createdBy: { select: { id: true, fullName: true, email: true } },
      updatedBy: { select: { id: true, fullName: true, email: true } },
      messages: { select: { id: true }, take: 1, orderBy: { createdAt: "desc" } },
      invoices: { select: { id: true, invoiceNumber: true, status: true, total: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 3 },
      tasks: { select: { id: true, status: true }, orderBy: { createdAt: "desc" } },
      documents: { select: { id: true, documentNumber: true, title: true, signedAt: true }, orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { lastActivityAt: "desc" },
  });

  return NextResponse.json({ data: matters });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.cases");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createMatterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const selectedClientIds = [...new Set([...(parsed.data.clientIds ?? []), ...(parsed.data.clientId ? [parsed.data.clientId] : [])])];

  const clients = await prisma.user.findMany({
    where: { id: { in: selectedClientIds }, role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] } },
    select: { id: true },
  });

  if (clients.length !== selectedClientIds.length) {
    return NextResponse.json({ error: "Un ou plusieurs clients sont introuvables." }, { status: 404 });
  }

  const primaryClientId = selectedClientIds[0];

  const matter = await prisma.lawMatter.create({
    data: {
      matterNumber: await buildChronologicalNumber("DOS", "law_matter"),
      clientId: primaryClientId,
      title: parsed.data.title,
      summary: parsed.data.summary,
      createdById: auth.user.id,
      updatedById: auth.user.id,
      lastActivityAt: new Date(),
      participants: {
        createMany: {
          data: selectedClientIds.map((clientId) => ({ clientId })),
        },
      },
    },
    include: {
      client: { select: { id: true, fullName: true, email: true, phone: true } },
      participants: {
        select: {
          client: { select: { id: true, fullName: true, firstName: true, lastName: true, email: true, citizenUniqueId: true } },
        },
      },
      createdBy: { select: { id: true, fullName: true, email: true } },
      updatedBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({ data: matter }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.cases");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateMatterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const matter = await prisma.lawMatter.findUnique({ where: { id: parsed.data.matterId } });
  if (!matter) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  if (parsed.data.action === "delete") {
    await prisma.lawMatter.delete({ where: { id: matter.id } });
    return NextResponse.json({ success: true });
  }

  const updated = await prisma.lawMatter.update({
    where: { id: matter.id },
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary === undefined ? undefined : parsed.data.summary ?? null,
      status: parsed.data.status,
      isArchived: parsed.data.action === "archive" ? true : parsed.data.action === "restore" ? false : parsed.data.isArchived,
      archivedAt: parsed.data.action === "archive" ? new Date() : parsed.data.action === "restore" ? null : undefined,
      archivedById: parsed.data.action === "archive" ? auth.user.id : parsed.data.action === "restore" ? null : undefined,
      updatedById: auth.user.id,
      lastActivityAt: new Date(),
    },
    include: {
      client: { select: { id: true, fullName: true, email: true, phone: true } },
      participants: {
        select: {
          client: { select: { id: true, fullName: true, firstName: true, lastName: true, email: true, citizenUniqueId: true } },
        },
      },
      createdBy: { select: { id: true, fullName: true, email: true } },
      updatedBy: { select: { id: true, fullName: true, email: true } },
      messages: { select: { id: true }, take: 1, orderBy: { createdAt: "desc" } },
      invoices: { select: { id: true, invoiceNumber: true, status: true, total: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 3 },
      tasks: { select: { id: true, status: true }, orderBy: { createdAt: "desc" } },
      documents: { select: { id: true, documentNumber: true, title: true, signedAt: true }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.cases");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateMatterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.lawMatter.delete({ where: { id: parsed.data.matterId } });
  return NextResponse.json({ success: true });
}
