import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createContactMessageSchema = z.object({
  clientId: z.string().uuid().optional(),
  body: z.string().min(2),
  documentLink: z.string().optional().or(z.literal("")),
});

function isCounselor(role: UserRole | "PUBLIC") {
  return role === "COLLABORATOR" || role === "ADMIN";
}

export async function GET(request: NextRequest) {
  try {
    const contactModel = (prisma as unknown as { contactMessage?: typeof prisma.contactMessage }).contactMessage;
    const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;
    if (!contactModel) {
      return NextResponse.json({ error: "Contact messaging not initialized. Reload server." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role === "PUBLIC") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIdParam = request.nextUrl.searchParams.get("clientId");
    const peek = request.nextUrl.searchParams.get("peek") === "1";

    const resolvedClientId = isCounselor(user.role) ? (clientIdParam ?? user.id) : user.id;

    if (!peek && conversationStateModel) {
      await conversationStateModel.upsert({
        where: { clientId: resolvedClientId },
        create: {
          clientId: resolvedClientId,
          staffLastReadAt: isCounselor(user.role) ? new Date() : null,
          clientLastReadAt: isCounselor(user.role) ? null : new Date(),
        },
        update: isCounselor(user.role)
          ? { staffLastReadAt: new Date() }
          : { clientLastReadAt: new Date() },
      });
    }

    if (isCounselor(user.role)) {
      const where = { clientId: resolvedClientId };
      const messages = await contactModel.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          clientId: true,
          senderId: true,
          senderRole: true,
          senderName: true,
          body: true,
          documentLink: true,
          createdAt: true,
          client: { select: { id: true, fullName: true, email: true } },
        },
      });

      return NextResponse.json({ data: messages });
    }

    const messages = await contactModel.findMany({
      where: { clientId: resolvedClientId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        clientId: true,
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
      { error: error instanceof Error ? error.message : "Impossible de charger les messages de contact." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contactModel = (prisma as unknown as { contactMessage?: typeof prisma.contactMessage }).contactMessage;
    const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;
    if (!contactModel) {
      return NextResponse.json({ error: "Contact messaging not initialized. Reload server." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role === "PUBLIC") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createContactMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const targetClientId = isCounselor(user.role) ? (parsed.data.clientId ?? user.id) : user.id;
    if (!targetClientId) {
      return NextResponse.json({ error: "clientId est requis pour ce role." }, { status: 400 });
    }

    const targetClient = await prisma.user.findUnique({
      where: { id: targetClientId },
      select: { id: true },
    });

    if (!targetClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
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

    const message = await contactModel.create({
      data: {
        clientId: targetClientId,
        senderId: user.id,
        senderRole: user.role,
        senderName,
        body: parsed.data.body,
        documentLink: parsed.data.documentLink || null,
      },
      select: {
        id: true,
        clientId: true,
        senderId: true,
        senderRole: true,
        senderName: true,
        body: true,
        documentLink: true,
        createdAt: true,
      },
    });

    if (conversationStateModel) {
      await conversationStateModel.upsert({
        where: { clientId: targetClientId },
        create: {
          clientId: targetClientId,
          staffLastReadAt: isCounselor(user.role) ? new Date() : null,
          clientLastReadAt: isCounselor(user.role) ? null : new Date(),
        },
        update: isCounselor(user.role)
          ? { staffLastReadAt: new Date() }
          : { clientLastReadAt: new Date() },
      });
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d'envoyer le message de contact." },
      { status: 500 },
    );
  }
}
