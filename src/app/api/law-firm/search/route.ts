import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.search");
  if (!auth.ok) {
    return auth.response;
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!query) {
    return NextResponse.json({ data: { users: [], matters: [], invoices: [], documents: [] } });
  }

  const [users, matters, invoices, documents] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: { id: true, fullName: true, email: true, role: true },
      take: 10,
    }),
    prisma.lawMatter.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { matterNumber: { contains: query } },
          { summary: { contains: query } },
          { client: { fullName: { contains: query } } },
        ],
      },
      select: { id: true, title: true, matterNumber: true, status: true, isArchived: true, client: { select: { fullName: true, email: true } } },
      take: 10,
    }),
    prisma.lawInvoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: query } },
          { matter: { title: { contains: query } } },
          { client: { fullName: { contains: query } } },
        ],
      },
      select: { id: true, invoiceNumber: true, status: true, total: true, matter: { select: { title: true } }, client: { select: { fullName: true } } },
      take: 10,
    }),
    prisma.generatedDocument.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { documentNumber: { contains: query } },
        ],
      },
      select: { id: true, title: true, documentNumber: true, signedAt: true, pdfUrl: true },
      take: 10,
    }),
  ]);

  return NextResponse.json({ data: { users, matters, invoices, documents } });
}
