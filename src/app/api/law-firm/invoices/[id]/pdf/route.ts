import { prisma } from "@/lib/prisma";
import { getCurrentUser, requirePermission } from "@/lib/server-auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

function formatMoney(value: number) {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("module:law_firm.billing");
  const shareToken = request.nextUrl.searchParams.get("share");
  const user = await getCurrentUser();

  if (!auth.ok && !shareToken) {
    return auth.response;
  }

  if (!user && !shareToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await prisma.lawInvoice.findUnique({
    where: { id },
    include: {
      matter: { select: { id: true, matterNumber: true, title: true } },
      client: { select: { id: true, fullName: true, email: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  if (!auth.ok && shareToken) {
    const tokenHash = createHash("sha256").update(shareToken).digest("hex");
    const isValid = invoice.shareTokenHash === tokenHash && (!invoice.shareTokenExpiresAt || invoice.shareTokenExpiresAt > new Date());
    if (!isValid) {
      return NextResponse.json({ error: "Lien de document invalide ou expiré." }, { status: 403 });
    }
  }

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  page.drawText("Facture professionnelle", { x: 40, y, size: 20, font: bold, color: rgb(0.07, 0.15, 0.35) });
  y -= 30;
  page.drawText(`Numero: ${invoice.invoiceNumber}`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(`Dossier: ${invoice.matter.matterNumber} - ${invoice.matter.title}`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(`Client: ${invoice.client.fullName} (${invoice.client.email})`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(`Statut: ${invoice.status}`, { x: 40, y, size: 11, font });
  y -= 28;

  page.drawText("Prestations", { x: 40, y, size: 13, font: bold });
  y -= 18;

  for (const line of invoice.lines) {
    if (y < 110) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }

    const label = `${line.description} | Qte ${line.quantity} | PU ${formatMoney(line.unitPrice)} | Remise ${line.discount}% | Total ${formatMoney(line.lineTotal)}`;
    page.drawText(label.slice(0, 120), { x: 45, y, size: 10, font });
    y -= 16;
  }

  y -= 16;
  page.drawText(`Sous-total: ${formatMoney(invoice.subtotal)}`, { x: 40, y, size: 11, font: bold });
  y -= 18;
  page.drawText(`Remise: ${formatMoney(invoice.discountTotal)}`, { x: 40, y, size: 11, font: bold });
  y -= 18;
  page.drawText(`Total: ${formatMoney(invoice.total)}`, { x: 40, y, size: 13, font: bold, color: rgb(0.07, 0.15, 0.35) });

  const bytes = await pdf.save();
  const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename=\"${invoice.invoiceNumber}.pdf\"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
