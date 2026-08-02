import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createMessageSchema = z.object({
  claimId: z.string().uuid(),
  body: z.string().min(2),
  documentLink: z.string().optional().or(z.literal("")),
});

function canReviewClaim(userRole: UserRole | "PUBLIC") {
  return userRole === "COLLABORATOR" || userRole === "ADMIN";
}

export async function GET(request: NextRequest) {
  try {
    const claimMessageModel = (prisma as unknown as { claimMessage?: typeof prisma.claimMessage }).claimMessage;
    if (!claimMessageModel) {
      return NextResponse.json({ error: "Claim messaging not initialized. Reload server." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role === "PUBLIC") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimId = request.nextUrl.searchParams.get("claimId");
    const peek = request.nextUrl.searchParams.get("peek") === "1";
    if (!claimId) {
      return NextResponse.json({ error: "claimId est requis." }, { status: 400 });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { id: true, clientId: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!canReviewClaim(user.role) && claim.clientId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!peek) {
      if (canReviewClaim(user.role)) {
        await prisma.claim.update({ where: { id: claimId }, data: { staffLastReadAt: new Date() } });
      } else {
        await prisma.claim.update({ where: { id: claimId }, data: { clientLastReadAt: new Date() } });
      }
    }

    const messages = await claimMessageModel.findMany({
      where: { claimId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        senderId: true,
        senderRole: true,
        senderName: true,
        body: true,
        documentLink: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de charger la conversation." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const claimMessageModel = (prisma as unknown as { claimMessage?: typeof prisma.claimMessage }).claimMessage;
    if (!claimMessageModel) {
      return NextResponse.json({ error: "Claim messaging not initialized. Reload server." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role === "PUBLIC") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: parsed.data.claimId },
      select: { id: true, clientId: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!canReviewClaim(user.role) && claim.clientId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const senderProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, firstName: true, lastName: true },
    });

    const senderName =
      [senderProfile?.firstName, senderProfile?.lastName].filter(Boolean).join(" ").trim() ||
      senderProfile?.fullName ||
      user.email ||
      "Utilisateur";

    const message = await claimMessageModel.create({
      data: {
        claimId: parsed.data.claimId,
        senderId: user.id,
        senderRole: user.role,
        senderName,
        body: parsed.data.body,
        documentLink: parsed.data.documentLink || null,
      },
      select: {
        id: true,
        senderId: true,
        senderRole: true,
        senderName: true,
        body: true,
        documentLink: true,
        createdAt: true,
      },
    });

    if (canReviewClaim(user.role)) {
      await prisma.claim.update({ where: { id: parsed.data.claimId }, data: { staffLastReadAt: new Date() } });
    } else {
      await prisma.claim.update({ where: { id: parsed.data.claimId }, data: { clientLastReadAt: new Date() } });
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d'envoyer le message." },
      { status: 500 },
    );
  }
}
