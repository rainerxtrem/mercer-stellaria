import { UserRole } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditPayload = {
  actorId?: string | null;
  actorRole?: UserRole | "PUBLIC" | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

export async function writeAuditLog(payload: AuditPayload) {
  const actorRole = payload.actorRole && payload.actorRole !== "PUBLIC" ? payload.actorRole : null;

  await prisma.auditLog.create({
    data: {
      actorId: payload.actorId ?? null,
      actorRole,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId ?? null,
      summary: payload.summary,
      details: payload.details,
      ipAddress: payload.ipAddress ?? null,
    },
  });
}

export async function writeAuditLogSafe(payload: AuditPayload) {
  try {
    await writeAuditLog(payload);
  } catch {
    // Silent by design: audit should never block user actions.
  }
}
