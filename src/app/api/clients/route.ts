import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { UserRole } from "@/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.email(),
  phone: z.string().optional(),
});

export async function GET() {
  const authResult = await requireRole("COLLABORATOR");
  if (!authResult.ok) {
    return authResult.response;
  }

  const where = { role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] } };

  const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;
  const clients = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      riskLabel: true,
      isArchived: true,
      archivedAt: true,
      discordHandle: true,
      createdAt: true,
      contactConversationState: {
        select: {
          conversationId: true,
          clientArchivedAt: true,
          staffArchivedAt: true,
          staffLastReadAt: true,
        },
      },
      clientContactMessages: {
        where: {
          senderRole: UserRole.CLIENT,
        },
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      claims: {
        select: {
          staffLastReadAt: true,
          messages: {
            where: {
              senderRole: UserRole.CLIENT,
            },
            select: {
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const payload = clients.map((client) => {
    const contactLastRead = client.contactConversationState?.staffLastReadAt ?? null;
    const latestClientContactMessage = client.clientContactMessages[0];
    const hasOpenContactConversation = Boolean(client.contactConversationState && !client.contactConversationState.staffArchivedAt);
    const hasUnreadContact = Boolean(
      client.contactConversationState &&
      latestClientContactMessage &&
        (!contactLastRead || latestClientContactMessage.createdAt.getTime() > contactLastRead.getTime()),
    );

    const hasUnreadClaimMessage = client.claims.some((claim) => {
      const latestClientClaimMessage = claim.messages[0];
      if (!latestClientClaimMessage) {
        return false;
      }

      if (!claim.staffLastReadAt) {
        return true;
      }

      return latestClientClaimMessage.createdAt.getTime() > claim.staffLastReadAt.getTime();
    });

    return {
      id: client.id,
      fullName: client.fullName,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      birthDate: client.birthDate,
      riskLabel: client.riskLabel,
      isArchived: client.isArchived,
      archivedAt: client.archivedAt,
      discordHandle: client.discordHandle,
      createdAt: client.createdAt,
      hasOpenContactConversation,
      hasUnreadClientMessage: hasUnreadContact || hasUnreadClaimMessage,
    };
  });

  return NextResponse.json({ data: payload });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole("COLLABORATOR");
  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json();
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Un utilisateur existe deja avec cet email." }, { status: 409 });
  }

  const client = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      role: UserRole.CLIENT,
      accountManagerId: authResult.user.role === "ADMIN" ? undefined : authResult.user.id,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: client }, { status: 201 });
}
