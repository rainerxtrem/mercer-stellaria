import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.documents");
  if (!auth.ok) {
    return auth.response;
  }

  const matterId = request.nextUrl.searchParams.get("matterId") ?? undefined;
  const generatedDocuments = await prisma.generatedDocument.findMany({
    where: matterId ? { matterId } : { matterId: { not: null } },
    include: {
      matter: { select: { id: true, matterNumber: true, title: true } },
      client: { select: { id: true, fullName: true, email: true } },
      creator: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const invoiceDocuments = await prisma.lawInvoice.findMany({
    where: {
      ...(matterId ? { matterId } : {}),
      OR: [{ pdfUrl: { not: null } }, { status: { in: ["SENT", "SIGNED", "BILLED", "PAID"] } }],
    },
    include: {
      matter: { select: { id: true, matterNumber: true, title: true } },
      client: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const generatedDocumentNumbers = new Set(generatedDocuments.map((document) => document.documentNumber));

  const invoiceAsDocuments = invoiceDocuments
    .filter((invoice) => !generatedDocumentNumbers.has(invoice.invoiceNumber))
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      source: "LAW_INVOICE",
      title: `Facture ${invoice.invoiceNumber}`,
      documentNumber: invoice.invoiceNumber,
      signedAt: invoice.signedAt,
      pdfUrl: invoice.pdfUrl ?? `/api/law-firm/invoices/${invoice.id}/pdf`,
      createdAt: invoice.createdAt,
      matter: invoice.matter,
      client: invoice.client,
      creator: invoice.createdBy,
    }));

  const documents = [
    ...generatedDocuments.map((document) => ({ ...document, source: "GENERATED_DOCUMENT" })),
    ...invoiceAsDocuments,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ data: documents });
}
