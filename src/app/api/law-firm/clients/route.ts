import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.cases");
  if (!auth.ok) {
    return auth.response;
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  const clients = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] },
      OR: q
        ? [
            { fullName: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { citizenUniqueId: { contains: q } },
          ]
        : undefined,
    },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      citizenUniqueId: true,
    },
    orderBy: { fullName: "asc" },
    take: q ? 50 : 500,
  });

  return NextResponse.json({ data: clients });
}
