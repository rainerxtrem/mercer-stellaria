import { ClaimStatus, NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { buildNumber } from "@/lib/ids";
import { toNumber } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { optionalHttpUrlSchema } from "@/lib/url-validation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createClaimSchema = z.object({
  contractId: z.string().uuid().optional(),
  incidentType: z.string().min(2),
  description: z.string().min(5),
  evidenceLink: optionalHttpUrlSchema,
  lspdReportLink: optionalHttpUrlSchema,
  incidentDate: z.string().min(1),
  requestedAmount: z.union([z.number(), z.string()]).optional(),
});

const updateClaimSchema = z.object({
  claimId: z.string().uuid(),
  status: z.enum([
    ClaimStatus.SUBMITTED,
    ClaimStatus.UNDER_REVIEW,
    ClaimStatus.WAITING_DETAILS,
    ClaimStatus.APPROVED,
    ClaimStatus.REJECTED,
    ClaimStatus.PAID,
  ]),
  approvedAmount: z.union([z.number(), z.string()]).optional(),
  decisionNotes: z.string().optional(),
});

const complementClaimSchema = z.object({
  claimId: z.string().uuid(),
  incidentType: z.string().min(2),
  description: z.string().min(5),
  evidenceLink: optionalHttpUrlSchema,
  lspdReportLink: optionalHttpUrlSchema,
  incidentDate: z.string().min(1),
  requestedAmount: z.union([z.number(), z.string()]).optional(),
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
        ? {}
        : { clientId: user.id };

  const claims = await prisma.claim.findMany({
    where,
    include: {
      client: { select: { id: true, fullName: true, email: true } },
      contract: { select: { id: true, contractNumber: true, formulaName: true } },
    },
    orderBy: { declaredAt: "desc" },
  });

  return NextResponse.json({ data: claims });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "PUBLIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createClaimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const claim = await prisma.claim.create({
    data: {
      claimNumber: buildNumber("CLM"),
      clientId: user.id,
      contractId: parsed.data.contractId,
      incidentType: parsed.data.incidentType,
      description: parsed.data.description,
      evidenceLink: parsed.data.evidenceLink || null,
      lspdReportLink: parsed.data.lspdReportLink || null,
      incidentDate: new Date(parsed.data.incidentDate),
      requestedAmount: parsed.data.requestedAmount !== undefined ? toNumber(parsed.data.requestedAmount) : null,
    },
  });

  await Promise.all([
    createAppNotificationSafe({
      recipientId: user.id,
      type: NotificationType.CLAIM,
      severity: NotificationSeverity.SUCCESS,
      title: "Sinistre déclaré",
      body: `Votre dossier ${claim.claimNumber} a bien été enregistré.`,
      link: "/client",
    }),
    writeAuditLogSafe({
      actorId: user.id,
      actorRole: user.role,
      action: "CLAIM_CREATED",
      entityType: "Claim",
      entityId: claim.id,
      summary: `Sinistre ${claim.claimNumber} créé`,
      details: {
        incidentType: claim.incidentType,
        requestedAmount: claim.requestedAmount,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    }),
  ]);

  return NextResponse.json({ data: claim }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "PUBLIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const staffUpdate = updateClaimSchema.safeParse(body);
  const complementUpdate = complementClaimSchema.safeParse(body);

  if (staffUpdate.success) {
    if (user.role !== "COLLABORATOR" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = staffUpdate;

    const existing = await prisma.claim.findUnique({
      where: { id: parsed.data.claimId },
      include: {
        contract: true,
        client: {
          select: {
            fullName: true,
            discordHandle: true,
            email: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (user.role === "COLLABORATOR" && existing.contract && existing.contract.agentId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (user.role === "COLLABORATOR" && Number(existing.requestedAmount ?? 0) > 15000) {
      return NextResponse.json(
        { error: "Ce sinistre depasse 15 000$. Validation direction obligatoire avant traitement." },
        { status: 403 },
      );
    }

    const updated = await prisma.claim.update({
      where: { id: parsed.data.claimId },
      data: {
        status: parsed.data.status,
        approvedAmount: parsed.data.approvedAmount !== undefined ? toNumber(parsed.data.approvedAmount) : existing.approvedAmount,
        decisionNotes: parsed.data.decisionNotes,
        reviewedById: user.id,
        reimbursedAt: parsed.data.status === ClaimStatus.PAID ? new Date() : existing.reimbursedAt,
      },
    });

    await Promise.all([
      createAppNotificationSafe({
        recipientId: existing.clientId,
        type: NotificationType.CLAIM,
        severity: parsed.data.status === ClaimStatus.REJECTED ? NotificationSeverity.WARNING : NotificationSeverity.INFO,
        title: "Mise à jour sinistre",
        body: `Votre dossier ${updated.claimNumber} est maintenant au statut ${updated.status}.`,
        link: "/client",
      }),
      writeAuditLogSafe({
        actorId: user.id,
        actorRole: user.role,
        action: "CLAIM_STATUS_UPDATED",
        entityType: "Claim",
        entityId: updated.id,
        summary: `Sinistre ${updated.claimNumber} mis à jour vers ${updated.status}`,
        details: {
          previousStatus: existing.status,
          nextStatus: updated.status,
          approvedAmount: updated.approvedAmount,
        },
        ipAddress: request.headers.get("x-forwarded-for"),
      }),
    ]);

    if (parsed.data.status === ClaimStatus.WAITING_DETAILS && process.env.DISCORD_WEBHOOK_URL) {
      const target = existing.client.discordHandle ?? existing.client.email ?? existing.client.fullName;
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Nouveau message dans votre espace assure. Dossier ${updated.claimNumber}: complement demande, merci de repondre pour la suite. Client: ${target}`,
        }),
      }).catch(() => null);
    }

    return NextResponse.json({ data: updated });
  }

  if (!complementUpdate.success) {
    return NextResponse.json({ error: complementUpdate.error.flatten() }, { status: 400 });
  }

  const parsed = complementUpdate;

  const existing = await prisma.claim.findFirst({
    where: {
      id: parsed.data.claimId,
      clientId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (existing.status !== ClaimStatus.WAITING_DETAILS) {
    return NextResponse.json({ error: "Ce dossier ne necessite pas de complement actuellement." }, { status: 409 });
  }

  const updated = await prisma.claim.update({
    where: { id: parsed.data.claimId },
    data: {
      incidentType: parsed.data.incidentType,
      description: parsed.data.description,
      evidenceLink: parsed.data.evidenceLink || null,
      lspdReportLink: parsed.data.lspdReportLink || null,
      incidentDate: new Date(parsed.data.incidentDate),
      requestedAmount: parsed.data.requestedAmount !== undefined ? toNumber(parsed.data.requestedAmount) : null,
      status: ClaimStatus.SUBMITTED,
      decisionNotes: null,
      approvedAmount: null,
      reviewedById: null,
      reimbursedAt: null,
    },
  });

  await Promise.all([
    createAppNotificationSafe({
      recipientId: user.id,
      type: NotificationType.CLAIM,
      severity: NotificationSeverity.INFO,
      title: "Compléments envoyés",
      body: `Les informations du dossier ${updated.claimNumber} ont été transmises au conseiller.`,
      link: "/client",
    }),
    writeAuditLogSafe({
      actorId: user.id,
      actorRole: user.role,
      action: "CLAIM_COMPLEMENT_SUBMITTED",
      entityType: "Claim",
      entityId: updated.id,
      summary: `Compléments envoyés pour ${updated.claimNumber}`,
      ipAddress: request.headers.get("x-forwarded-for"),
    }),
  ]);

  return NextResponse.json({ data: updated });
}
