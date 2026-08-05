import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(3).max(120),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().max(300).optional(),
  content: z.string().min(20),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(3).max(120).optional(),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(300).optional().or(z.literal("")),
  content: z.string().min(20).optional(),
  isActive: z.boolean().optional(),
});

const deleteTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const templates = await prisma.documentTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      content: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, fullName: true } },
      updatedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json({ data: templates });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.documentTemplate.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      content: parsed.data.content,
      isActive: parsed.data.isActive ?? true,
      createdById: auth.user.id,
      updatedById: auth.user.id,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = updateTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.documentTemplate.findUnique({
    where: { id: parsed.data.templateId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  }

  const updated = await prisma.documentTemplate.update({
    where: { id: parsed.data.templateId },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description === "" ? null : parsed.data.description,
      content: parsed.data.content,
      isActive: parsed.data.isActive,
      updatedById: auth.user.id,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = deleteTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.documentTemplate.findUnique({
    where: { id: parsed.data.templateId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  }

  await prisma.documentTemplate.delete({ where: { id: parsed.data.templateId } });

  return NextResponse.json({ success: true });
}
