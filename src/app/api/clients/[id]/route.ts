import { ClaimStatus, UserRole } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { computeRiskScore, getRiskLabel, type RiskAnswers } from "@/lib/risk";
import { requireRole } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const riskAnswersSchema = z.object({
  medicalHistoryRisk: z.number().int().min(0).max(3),
  lifestyleRisk: z.number().int().min(0).max(3),
  occupationRisk: z.number().int().min(0).max(3),
  drivingExposure: z.number().int().min(0).max(3),
  homeSecurityRisk: z.number().int().min(0).max(3),
  claimsHistoryRisk: z.number().int().min(0).max(3),
  highValueAssetsRisk: z.number().int().min(0).max(3),
});

const updateClientSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160).optional(),
    phone: z.string().trim().min(6).max(40).optional(),
    birthDate: z.string().min(1).optional(),
    citizenUniqueId: z.string().trim().min(3).max(80).optional(),
    answers: riskAnswersSchema.optional(),
  })
  .refine((value) => value.fullName !== undefined || value.phone !== undefined || value.birthDate !== undefined || value.citizenUniqueId !== undefined || value.answers !== undefined, {
    message: "Aucune modification fournie.",
  });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole("COLLABORATOR");
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await context.params;

  const client = await prisma.user.findFirst({
    where: {
      id,
      role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] },
    },
    select: {
      id: true,
      role: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      citizenUniqueId: true,
      riskQuestionnaire: true,
      riskLabel: true,
      riskScore: true,
      isArchived: true,
      archivedAt: true,
      createdAt: true,
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Assure introuvable." }, { status: 404 });
  }

  const [contracts, claims, requests, riskHistory] = await Promise.all([
    prisma.contract.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contractNumber: true,
        category: true,
        formulaName: true,
        status: true,
        weeklyPremium: true,
        effectiveDate: true,
        expirationDate: true,
        createdAt: true,
      },
    }),
    prisma.claim.findMany({
      where: { clientId: id },
      orderBy: { declaredAt: "desc" },
      select: {
        id: true,
        claimNumber: true,
        incidentType: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        declaredAt: true,
      },
    }),
    prisma.subscriptionRequest.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        requestNumber: true,
        type: true,
        requestedFormula: true,
        currentFormula: true,
        status: true,
        advisorValidated: true,
        createdAt: true,
      },
    }),
    prisma.riskQuestionnaireHistory.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        oldAnswers: true,
        newAnswers: true,
        oldScore: true,
        newScore: true,
        oldLabel: true,
        newLabel: true,
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  const claimSummary = {
    requested: claims.filter((claim) => claim.status === ClaimStatus.SUBMITTED).length,
    waiting: claims.filter((claim) => claim.status === ClaimStatus.WAITING_DETAILS).length,
    reviewing: claims.filter((claim) => claim.status === ClaimStatus.UNDER_REVIEW).length,
  };

  return NextResponse.json({ data: { client, contracts, claims, requests, claimSummary, riskHistory } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole("COLLABORATOR");
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      id,
      role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] },
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      birthDate: true,
      citizenUniqueId: true,
      riskQuestionnaire: true,
      riskScore: true,
      riskLabel: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assure introuvable." }, { status: 404 });
  }

  if (parsed.data.citizenUniqueId) {
    const duplicate = await prisma.user.findFirst({
      where: {
        citizenUniqueId: parsed.data.citizenUniqueId,
        id: { not: id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Cet ID Citoyen Unique est deja utilise." }, { status: 409 });
    }
  }

  let birthDate: Date | undefined;
  if (parsed.data.birthDate !== undefined) {
    birthDate = new Date(parsed.data.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });
    }
  }

  const updateData: Prisma.UserUpdateInput = {};
  if (parsed.data.fullName !== undefined) {
    updateData.fullName = parsed.data.fullName;
  }
  if (parsed.data.phone !== undefined) {
    updateData.phone = parsed.data.phone;
  }
  if (parsed.data.birthDate !== undefined) {
    updateData.birthDate = birthDate;
  }
  if (parsed.data.citizenUniqueId !== undefined) {
    updateData.citizenUniqueId = parsed.data.citizenUniqueId;
  }

  const previousAnswers = existing.riskQuestionnaire as RiskAnswers | null;
  let nextAnswers: RiskAnswers | undefined;
  let nextScore: number | undefined;
  let nextLabel: string | undefined;

  if (parsed.data.answers) {
    nextAnswers = parsed.data.answers as RiskAnswers;
    nextScore = computeRiskScore(nextAnswers);
    nextLabel = getRiskLabel(nextScore);
    updateData.riskQuestionnaire = nextAnswers as Prisma.InputJsonValue;
    updateData.riskScore = nextScore;
    updateData.riskLabel = nextLabel;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      birthDate: true,
      citizenUniqueId: true,
      riskQuestionnaire: true,
      riskScore: true,
      riskLabel: true,
      role: true,
    },
  });

  if (nextAnswers && nextScore !== undefined && nextLabel !== undefined) {
    await prisma.riskQuestionnaireHistory.create({
      data: {
        clientId: id,
        actorId: authResult.user.id,
        oldAnswers: previousAnswers ? (previousAnswers as Prisma.InputJsonValue) : Prisma.JsonNull,
        newAnswers: nextAnswers as Prisma.InputJsonValue,
        oldScore: existing.riskScore,
        newScore: nextScore,
        oldLabel: existing.riskLabel,
        newLabel: nextLabel,
      },
    });
  }

  await writeAuditLogSafe({
    actorId: authResult.user.id,
    actorRole: authResult.user.role,
    action: "CLIENT_PROFILE_UPDATED",
    entityType: "User",
    entityId: id,
    summary: `Fiche client ${updated.fullName} modifiee`,
    details: {
      old: {
        fullName: existing.fullName,
        phone: existing.phone,
        birthDate: existing.birthDate?.toISOString() ?? null,
        citizenUniqueId: existing.citizenUniqueId,
        riskQuestionnaire: previousAnswers as Prisma.InputJsonValue | null,
        riskScore: existing.riskScore,
        riskLabel: existing.riskLabel,
      },
      next: {
        fullName: updated.fullName,
        phone: updated.phone,
        birthDate: updated.birthDate?.toISOString() ?? null,
        citizenUniqueId: updated.citizenUniqueId,
        riskQuestionnaire: updated.riskQuestionnaire as Prisma.InputJsonValue | null,
        riskScore: updated.riskScore,
        riskLabel: updated.riskLabel,
      },
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole("COLLABORATOR");
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await context.params;

  const existing = await prisma.user.findFirst({
    where: {
      id,
      role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] },
    },
    select: { id: true, isArchived: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assure introuvable." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      isArchived: !existing.isArchived,
      archivedAt: existing.isArchived ? null : new Date(),
      archivedById: existing.isArchived ? null : authResult.user.id,
    },
    select: {
      id: true,
      isArchived: true,
      archivedAt: true,
    },
  });

  return NextResponse.json({ data: updated });
}
