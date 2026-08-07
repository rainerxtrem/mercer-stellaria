import { UserRole } from "@/generated/prisma/enums";
import { ensureRbacBootstrap } from "@/lib/grade-permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2).optional(),
  firstName: z.string().min(1).nullable().optional(),
  lastName: z.string().min(1).nullable().optional(),
  email: z.email().optional(),
  phone: z.string().min(3).nullable().optional(),
  role: z.enum([UserRole.PUBLIC, UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN]).optional(),
  isActive: z.boolean().optional(),
  gradeIds: z.array(z.string().uuid()).optional(),
});

export async function GET() {
  const auth = await requirePermission("module:settings.users_roles");
  if (!auth.ok) {
    return auth.response;
  }

  await ensureRbacBootstrap();

  const [users, grades] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        userGrades: {
          select: {
            grade: {
              select: {
                id: true,
                code: true,
                name: true,
                rank: true,
              },
            },
            assignedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.grade.findMany({
      select: { id: true, code: true, name: true, rank: true, isSystem: true },
      orderBy: { rank: "asc" },
    }),
  ]);

  return NextResponse.json({ data: { users, grades } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("module:settings.users_roles");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.userId === auth.user.id && payload.isActive === false) {
    return NextResponse.json({ error: "Vous ne pouvez pas desactiver votre propre compte." }, { status: 400 });
  }

  if (payload.gradeIds) {
    const knownGrades = await prisma.grade.findMany({ where: { id: { in: payload.gradeIds } }, select: { id: true } });
    if (knownGrades.length !== payload.gradeIds.length) {
      return NextResponse.json({ error: "Un ou plusieurs grades sont invalides." }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: payload.userId },
      data: {
        fullName: payload.fullName,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        isActive: payload.isActive,
      },
    });

    if (payload.gradeIds) {
      await tx.userGrade.deleteMany({ where: { userId: payload.userId } });

      if (payload.gradeIds.length > 0) {
        await tx.userGrade.createMany({
          data: payload.gradeIds.map((gradeId) => ({
            userId: payload.userId,
            gradeId,
            assignedById: auth.user.id,
          })),
        });
      }
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      profileCompleted: true,
      createdAt: true,
      updatedAt: true,
      userGrades: {
        select: {
          grade: {
            select: {
              id: true,
              code: true,
              name: true,
              rank: true,
            },
          },
          assignedAt: true,
        },
      },
    },
  });

  return NextResponse.json({ data: updated });
}
