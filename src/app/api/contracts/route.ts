import { ContractCategory, ContractStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
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

  return NextResponse.json({ data: contract }, { status: 201 });
}
