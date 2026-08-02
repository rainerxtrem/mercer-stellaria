import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createTeamSchema = z.object({
  fullName: z.string().min(2),
  email: z.email(),
});

const updateTeamSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2).optional(),
  email: z.email().optional(),
  isActive: z.boolean().optional(),
});

const deleteSchema = z.object({
  userId: z.string().uuid(),
});

export async function GET() {
  const authResult = await requireRole("ADMIN");
  if (!authResult.ok) {
    return authResult.response;
  }

  const team = await prisma.user.findMany({
    where: { role: UserRole.COLLABORATOR },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: team });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json();
  const parsed = createTeamSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Email deja utilise." }, { status: 409 });
  }

  const collaborator = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      role: UserRole.COLLABORATOR,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: collaborator }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json();
  const parsed = updateTeamSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user || user.role !== UserRole.COLLABORATOR) {
    return NextResponse.json({ error: "Collaborateur introuvable." }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: parsed.data.userId } });

  return NextResponse.json({ success: true });
}
