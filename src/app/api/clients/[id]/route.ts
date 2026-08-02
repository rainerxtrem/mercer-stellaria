import { ClaimStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";

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
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
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

  const [contracts, claims, requests] = await Promise.all([
    prisma.contract.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contractNumber: true,
        formulaName: true,
        status: true,
        weeklyPremium: true,
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
  ]);

  const claimSummary = {
    requested: claims.filter((claim) => claim.status === ClaimStatus.SUBMITTED).length,
    waiting: claims.filter((claim) => claim.status === ClaimStatus.WAITING_DETAILS).length,
    reviewing: claims.filter((claim) => claim.status === ClaimStatus.UNDER_REVIEW).length,
  };

  return NextResponse.json({ data: { client, contracts, claims, requests, claimSummary } });
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
