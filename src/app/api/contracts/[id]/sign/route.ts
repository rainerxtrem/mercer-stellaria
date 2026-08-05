import { SignatureMethod, ContractStatus } from "@/generated/prisma/enums";
import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { generateContractPdf } from "@/lib/contract-documents";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const signSchema = z.object({
  method: z.enum([SignatureMethod.DRAWN_CANVAS, SignatureMethod.CERTIFIED_CLICK]),
  signatureData: z.string().optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const body = await request.json();
  const parsed = signSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.method === SignatureMethod.DRAWN_CANVAS && !parsed.data.signatureData) {
    return NextResponse.json({ error: "Signature canvas requise." }, { status: 400 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { client: true, agent: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const canSign = contract.clientId === user.id;
  if (!canSign) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pdfUrl = await generateContractPdf({
    contractNumber: contract.contractNumber,
    clientName: contract.client.fullName,
    formulaName: contract.formulaName,
    weeklyPremium: contract.weeklyPremium.toString(),
    effectiveDate: contract.effectiveDate.toLocaleDateString("fr-FR"),
    signatureMethod: parsed.data.method,
    signatureData: parsed.data.signatureData ?? null,
  });

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      signatureMethod: parsed.data.method,
      signatureData: parsed.data.signatureData ?? null,
      signedAt: new Date(),
      status: ContractStatus.ACTIVE,
      pdfUrl,
    },
  });

  await Promise.all([
    createAppNotificationSafe({
      recipientId: contract.clientId,
      type: NotificationType.CONTRACT,
      severity: NotificationSeverity.SUCCESS,
      title: "Contrat activé",
      body: `Le contrat ${contract.contractNumber} est signé et actif.`,
      link: "/client",
    }),
    createAppNotificationSafe({
      recipientId: contract.agentId,
      type: NotificationType.CONTRACT,
      severity: NotificationSeverity.SUCCESS,
      title: "Contrat signé par le client",
      body: `${contract.client.fullName} a signé le contrat ${contract.contractNumber}.`,
      link: "/collaborateur",
    }),
    writeAuditLogSafe({
      actorId: user.id,
      actorRole: user.role,
      action: "CONTRACT_SIGNED",
      entityType: "Contract",
      entityId: contract.id,
      summary: `Contrat ${contract.contractNumber} signé`,
      details: {
        method: parsed.data.method,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    }),
  ]);

  return NextResponse.json({ data: updated });
}
