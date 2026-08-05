import { ContractCategory, ContractStatus, NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { buildNumber } from "@/lib/ids";
import { toNumber } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const createContractSchema = z.object({
  clientId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  category: z.enum([ContractCategory.HEALTH, ContractCategory.THEFT_BURGLARY, ContractCategory.PROFESSIONAL]),
  formulaName: z.string().min(2),
  weeklyPremium: z.union([z.number(), z.string()]),
  coverageSummary: z.record(z.string(), z.unknown()),
  effectiveDate: z.string().min(1),
  expirationDate: z.string().optional(),
});

const manageContractSchema = z.object({
  contractId: z.string().uuid(),
  action: z.enum(["UPGRADE", "MODIFY", "DELETE"]),
  category: z.enum([ContractCategory.HEALTH, ContractCategory.THEFT_BURGLARY, ContractCategory.PROFESSIONAL]).optional(),
  formulaName: z.string().min(2).optional(),
  weeklyPremium: z.union([z.number(), z.string()]).optional(),
  coverageSummary: z.record(z.string(), z.unknown()).optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get("scope");
  const forceSelfScope = scope === "self";

  const where =
    forceSelfScope
      ? { clientId: user.id }
      : user.role === "ADMIN"
      ? {}
      : user.role === "COLLABORATOR"
        ? { agentId: user.id }
        : { clientId: user.id };

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      client: { select: { id: true, fullName: true, email: true } },
      agent: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: contracts });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole("COLLABORATOR");
  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const agentId = authResult.user.role === "ADMIN" ? (parsed.data.agentId ?? authResult.user.id) : authResult.user.id;
  const weeklyPremium = toNumber(parsed.data.weeklyPremium);

  const targetClient = await prisma.user.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true, role: true },
  });

  if (!targetClient || targetClient.role === "PUBLIC") {
    return NextResponse.json({ error: "Le contrat doit être proposé à un compte assuré actif." }, { status: 400 });
  }

  const contract = await prisma.contract.create({
    data: {
      contractNumber: buildNumber("CTR"),
      clientId: parsed.data.clientId,
      agentId,
      category: parsed.data.category,
      formulaName: parsed.data.formulaName,
      weeklyPremium,
      coverageSummary: parsed.data.coverageSummary as Prisma.InputJsonValue,
      effectiveDate: new Date(parsed.data.effectiveDate),
      expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : null,
      status: ContractStatus.PENDING_SIGNATURE,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: buildNumber("INV"),
      contractId: contract.id,
      clientId: contract.clientId,
      amount: weeklyPremium,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await Promise.all([
    createAppNotificationSafe({
      recipientId: contract.clientId,
      type: NotificationType.CONTRACT,
      severity: NotificationSeverity.INFO,
      title: "Nouveau contrat à signer",
      body: `Le contrat ${contract.contractNumber} (${contract.formulaName}) attend votre signature.`,
      link: "/client",
    }),
    writeAuditLogSafe({
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      action: "CONTRACT_CREATED",
      entityType: "Contract",
      entityId: contract.id,
      summary: `Contrat ${contract.contractNumber} proposé au client ${contract.clientId}`,
      details: {
        category: contract.category,
        formulaName: contract.formulaName,
        weeklyPremium,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    }),
  ]);

  return NextResponse.json({ data: contract }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireRole("COLLABORATOR");
  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json();
  const parsed = manageContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.contract.findUnique({
    where: { id: parsed.data.contractId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
  }

  if (authResult.user.role !== "ADMIN" && existing.agentId !== authResult.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.action === "DELETE") {
    const deletedContract = await prisma.contract.update({
      where: { id: existing.id },
      data: {
        status: ContractStatus.TERMINATED,
        expirationDate: new Date(),
      },
    });

    await Promise.all([
      createAppNotificationSafe({
        recipientId: deletedContract.clientId,
        type: NotificationType.CONTRACT,
        severity: NotificationSeverity.WARNING,
        title: "Contrat clôturé",
        body: `Le contrat ${deletedContract.contractNumber} a été clôturé par votre conseiller.`,
        link: "/client",
      }),
      writeAuditLogSafe({
        actorId: authResult.user.id,
        actorRole: authResult.user.role,
        action: "CONTRACT_TERMINATED",
        entityType: "Contract",
        entityId: deletedContract.id,
        summary: `Contrat ${deletedContract.contractNumber} clôturé`,
        ipAddress: request.headers.get("x-forwarded-for"),
      }),
    ]);

    return NextResponse.json({ data: deletedContract });
  }

  const nextCategory = parsed.data.category ?? existing.category;
  const nextFormulaName = parsed.data.formulaName ?? existing.formulaName;
  const nextWeeklyPremium = parsed.data.weeklyPremium !== undefined
    ? toNumber(parsed.data.weeklyPremium)
    : existing.weeklyPremium;
  const nextCoverageSummary = (parsed.data.coverageSummary ?? existing.coverageSummary) as Prisma.InputJsonValue;
  const nextEffectiveDate = parsed.data.effectiveDate
    ? new Date(parsed.data.effectiveDate)
    : existing.effectiveDate;
  const nextExpirationDate = parsed.data.expirationDate === undefined
    ? existing.expirationDate
    : parsed.data.expirationDate
      ? new Date(parsed.data.expirationDate)
      : null;

  if (parsed.data.action === "UPGRADE") {
    const upgradedContract = await prisma.contract.create({
      data: {
        contractNumber: buildNumber("CTR"),
        clientId: existing.clientId,
        agentId: existing.agentId,
        category: nextCategory,
        formulaName: nextFormulaName,
        weeklyPremium: nextWeeklyPremium,
        coverageSummary: nextCoverageSummary,
        effectiveDate: nextEffectiveDate,
        expirationDate: nextExpirationDate,
        status: ContractStatus.PENDING_SIGNATURE,
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: buildNumber("INV"),
        contractId: upgradedContract.id,
        clientId: upgradedContract.clientId,
        amount: nextWeeklyPremium,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await Promise.all([
      createAppNotificationSafe({
        recipientId: upgradedContract.clientId,
        type: NotificationType.CONTRACT,
        severity: NotificationSeverity.INFO,
        title: "Proposition d'upgrade",
        body: `Une nouvelle proposition (${upgradedContract.formulaName}) attend votre signature.`,
        link: "/client",
      }),
      writeAuditLogSafe({
        actorId: authResult.user.id,
        actorRole: authResult.user.role,
        action: "CONTRACT_UPGRADE_PROPOSED",
        entityType: "Contract",
        entityId: upgradedContract.id,
        summary: `Upgrade proposé depuis ${existing.contractNumber} vers ${upgradedContract.contractNumber}`,
        details: {
          sourceContractId: existing.id,
          newFormula: nextFormulaName,
          weeklyPremium: nextWeeklyPremium,
        },
        ipAddress: request.headers.get("x-forwarded-for"),
      }),
    ]);

    return NextResponse.json({ data: upgradedContract });
  }

  const modifiedContract = await prisma.contract.update({
    where: { id: existing.id },
    data: {
      category: nextCategory,
      formulaName: nextFormulaName,
      weeklyPremium: nextWeeklyPremium,
      coverageSummary: nextCoverageSummary,
      effectiveDate: nextEffectiveDate,
      expirationDate: nextExpirationDate,
      status: ContractStatus.PENDING_SIGNATURE,
      signatureMethod: null,
      signatureData: null,
      signedAt: null,
      pdfUrl: null,
    },
  });

  await Promise.all([
    createAppNotificationSafe({
      recipientId: modifiedContract.clientId,
      type: NotificationType.CONTRACT,
      severity: NotificationSeverity.INFO,
      title: "Contrat modifié",
      body: `Le contrat ${modifiedContract.contractNumber} a été mis à jour et nécessite une nouvelle signature.`,
      link: "/client",
    }),
    writeAuditLogSafe({
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      action: "CONTRACT_MODIFIED",
      entityType: "Contract",
      entityId: modifiedContract.id,
      summary: `Contrat ${modifiedContract.contractNumber} modifié`,
      details: {
        category: nextCategory,
        formulaName: nextFormulaName,
        weeklyPremium: nextWeeklyPremium,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    }),
  ]);

  return NextResponse.json({ data: modifiedContract });
}
