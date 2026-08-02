import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/server-auth";
import { UserRole } from "@/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateAccessSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["CLIENT", "COLLABORATOR", "ADMIN"]),
  isActive: z.boolean().optional(),
});

const OWNER_DISCORD_HANDLE = (process.env.OWNER_DISCORD_HANDLE ?? "baptiste_72").toLowerCase();

function normalizeHandle(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.split("#")[0] ?? normalized;
}

export async function GET() {
  const authResult = await requireOwner();
  if (!authResult.ok) {
    return authResult.response;
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      discordHandle: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: users });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireOwner();
  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json();
  const parsed = updateAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.userId === authResult.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre role." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, discordHandle: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  if (normalizeHandle(target.discordHandle) === OWNER_DISCORD_HANDLE) {
    return NextResponse.json({ error: "Le compte proprietaire ne peut pas etre modifie." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      discordHandle: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: updated });
}
