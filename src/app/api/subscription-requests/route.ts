import { ContractCategory, SubscriptionRequestStatus, SubscriptionRequestType } from "@/generated/prisma/enums";
import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { buildNumber } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createRequestSchema = z.object({
  type: z.enum([SubscriptionRequestType.NEW_SUBSCRIPTION, SubscriptionRequestType.UPGRADE]),
  requestedCategory: z.enum([ContractCategory.HEALTH, ContractCategory.THEFT_BURGLARY, ContractCategory.PROFESSIONAL]),
  requestedFormula: z.string().min(2),
  currentFormula: z.string().optional(),
  reason: z.string().max(1000).optional(),
});

const updateRequestSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum([
    SubscriptionRequestStatus.REQUESTED,
    SubscriptionRequestStatus.WAITING_MEETING,
    SubscriptionRequestStatus.UNDER_REVIEW,
    SubscriptionRequestStatus.APPROVED,
    SubscriptionRequestStatus.REJECTED,
  ]),
  advisorValidated: z.boolean().optional(),
  reviewNotes: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "PUBLIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get("scope");
  const forceSelfScope = scope === "self";

  const where = forceSelfScope || user.role === "CLIENT" ? { clientId: user.id } : {};

  const requests = await prisma.subscriptionRequest.findMany({
    where,
    include: {
      client: { select: { id: true, fullName: true, email: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: requests });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "PUBLIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.subscriptionRequest.create({
    data: {
      requestNumber: buildNumber("REQ"),
      clientId: user.id,
      type: parsed.data.type,
      requestedCategory: parsed.data.requestedCategory,
      requestedFormula: parsed.data.requestedFormula,
      currentFormula: parsed.data.currentFormula || null,
      reason: parsed.data.reason || null,
      status: SubscriptionRequestStatus.REQUESTED,
    },
  });

  await Promise.all([
    createAppNotificationSafe({
      recipientId: user.id,
      type: NotificationType.REQUEST,
      severity: NotificationSeverity.INFO,
      title: "Demande enregistrée",
      body: `La demande ${created.requestNumber} a bien été envoyée.`,
      link: "/client",
    }),
    writeAuditLogSafe({
      actorId: user.id,
      actorRole: user.role,
      action: "SUBSCRIPTION_REQUEST_CREATED",
      entityType: "SubscriptionRequest",
      entityId: created.id,
      summary: `Demande ${created.requestNumber} créée`,
      details: {
        type: created.type,
        requestedCategory: created.requestedCategory,
        requestedFormula: created.requestedFormula,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    }),
  ]);

  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "COLLABORATOR" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.subscriptionRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const updated = await prisma.subscriptionRequest.update({
    where: { id: parsed.data.requestId },
    data: {
      status: parsed.data.status,
      advisorValidated: parsed.data.advisorValidated ?? existing.advisorValidated,
      reviewNotes: parsed.data.reviewNotes ?? existing.reviewNotes,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await Promise.all([
    createAppNotificationSafe({
      recipientId: existing.clientId,
      type: NotificationType.REQUEST,
      severity: parsed.data.status === SubscriptionRequestStatus.REJECTED ? NotificationSeverity.WARNING : NotificationSeverity.INFO,
      title: "Mise à jour de demande",
      body: `Votre demande ${existing.requestNumber} est désormais au statut ${updated.status}.`,
      link: "/client",
    }),
    writeAuditLogSafe({
      actorId: user.id,
      actorRole: user.role,
      action: "SUBSCRIPTION_REQUEST_UPDATED",
      entityType: "SubscriptionRequest",
      entityId: updated.id,
      summary: `Demande ${existing.requestNumber} mise à jour vers ${updated.status}`,
      details: {
        previousStatus: existing.status,
        nextStatus: updated.status,
        advisorValidated: updated.advisorValidated,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    }),
  ]);

  return NextResponse.json({ data: updated });
}
