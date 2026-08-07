import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PAGE_SIZE = 200;
const EXPORT_LIMIT = 5000;

function escapeCsvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  // Neutralise l'injection de formule à l'ouverture du CSV dans un tableur.
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function buildWhere(searchParams: URLSearchParams): Prisma.AuditLogWhereInput {
  const action = searchParams.get("action")?.trim();
  const entityType = searchParams.get("entityType")?.trim();
  const actorId = searchParams.get("actorId")?.trim();
  const search = searchParams.get("search")?.trim();
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const hasFrom = Boolean(fromDate && !Number.isNaN(fromDate.getTime()));
  const hasTo = Boolean(toDate && !Number.isNaN(toDate.getTime()));

  return {
    action: action || undefined,
    entityType: entityType || undefined,
    actorId: actorId || undefined,
    createdAt:
      hasFrom || hasTo
        ? {
            gte: hasFrom ? (fromDate as Date) : undefined,
            lte: hasTo ? (toDate as Date) : undefined,
          }
        : undefined,
    OR: search
      ? [
          { summary: { contains: search } },
          { action: { contains: search } },
          { entityType: { contains: search } },
          { entityId: { contains: search } },
        ]
      : undefined,
  };
}

const auditSelection = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  summary: true,
  createdAt: true,
  actorRole: true,
  actor: { select: { id: true, fullName: true, email: true } },
} as const;

export async function GET(request: NextRequest) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.ok) {
    return authResult.response;
  }

  const searchParams = request.nextUrl.searchParams;
  const where = buildWhere(searchParams);

  if (searchParams.get("format") === "csv") {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: EXPORT_LIMIT,
      select: auditSelection,
    });

    const header = ["Date", "Action", "Type", "Identifiant", "Acteur", "Email", "Role", "Resume"];
    const rows = logs.map((log) =>
      [
        log.createdAt.toISOString(),
        log.action,
        log.entityType,
        log.entityId,
        log.actor?.fullName ?? "",
        log.actor?.email ?? "",
        log.actorRole,
        log.summary,
      ]
        .map(escapeCsvCell)
        .join(","),
    );

    const csv = `\uFEFF${[header.map(escapeCsvCell).join(","), ...rows].join("\r\n")}`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize") ?? 50) || 50));

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: auditSelection,
    }),
  ]);

  return NextResponse.json({
    data: logs,
    meta: { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  });
}
