import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

function isCounselor(role: UserRole | "PUBLIC") {
  return role === "COLLABORATOR" || role === "ADMIN";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === "PUBLIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;

  if (isCounselor(user.role)) {
    const conversationStates = conversationStateModel
      ? await (conversationStateModel as unknown as {
          findMany: (args: {
            select: {
              clientId: boolean;
              staffArchivedAt: boolean;
            };
          }) => Promise<Array<{ clientId: string; staffArchivedAt: Date | null }>>;
        }).findMany({
          select: { clientId: true, staffArchivedAt: true },
        })
      : [];

    const archivedForStaff = new Set(
      conversationStates.filter((state) => state.staffArchivedAt).map((state) => state.clientId),
    );

    const clients = await prisma.user.findMany({
      where: { role: { in: [UserRole.CLIENT, UserRole.COLLABORATOR, UserRole.ADMIN] } },
      select: {
        id: true,
        contactConversationState: conversationStateModel ? { select: { staffLastReadAt: true } } : false,
        clientContactMessages: {
          select: { senderId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        claims: {
          select: {
            staffLastReadAt: true,
            messages: {
              select: { senderId: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
      },
    });

    const unreadClients = clients.filter((client) => {
      if (archivedForStaff.has(client.id)) {
        return false;
      }

      const contactLastRead = client.contactConversationState?.staffLastReadAt ?? null;
      const latestClientContactMessage = client.clientContactMessages.find((message) => message.senderId === client.id);
      const hasUnreadContact = Boolean(
        latestClientContactMessage &&
          (!contactLastRead || latestClientContactMessage.createdAt.getTime() > contactLastRead.getTime()),
      );

      const hasUnreadClaimMessage = client.claims.some((claim) => {
        const latestClientClaimMessage = claim.messages.find((message) => message.senderId === client.id);
        if (!latestClientClaimMessage) {
          return false;
        }

        if (!claim.staffLastReadAt) {
          return true;
        }

        return latestClientClaimMessage.createdAt.getTime() > claim.staffLastReadAt.getTime();
      });

      return hasUnreadContact || hasUnreadClaimMessage;
    });

    return NextResponse.json({
      data: {
        hasUnread: unreadClients.length > 0,
        unreadClientIds: unreadClients.map((client) => client.id),
      },
    });
  }

  const clientId = user.id;
  const conversationStateRaw = conversationStateModel
    ? await (conversationStateModel as unknown as {
        findUnique: (args: {
          where: { clientId: string };
          select: {
            clientLastReadAt: boolean;
            clientArchivedAt: boolean;
          };
        }) => Promise<{ clientLastReadAt: Date | null; clientArchivedAt: Date | null } | null>;
      }).findUnique({
        where: { clientId },
        select: { clientLastReadAt: true, clientArchivedAt: true },
      })
    : null;

  const contactState = conversationStateModel
    ? await conversationStateModel.findUnique({
        where: { clientId },
        select: { clientLastReadAt: true },
      })
    : null;

  const lastContactFromStaff = await prisma.contactMessage.findFirst({
    where: {
      clientId,
      senderId: { not: clientId },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const unreadContact = Boolean(
    !conversationStateRaw?.clientArchivedAt &&
    lastContactFromStaff &&
      (!contactState?.clientLastReadAt || lastContactFromStaff.createdAt.getTime() > contactState.clientLastReadAt.getTime()),
  );

  const claims = await prisma.claim.findMany({
    where: { clientId },
    select: {
      id: true,
      clientLastReadAt: true,
      messages: {
        where: { senderId: { not: clientId } },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const unreadClaims = claims.filter((claim) => {
    const latestStaffMessage = claim.messages[0];
    if (!latestStaffMessage) {
      return false;
    }
    if (!claim.clientLastReadAt) {
      return true;
    }
    return latestStaffMessage.createdAt.getTime() > claim.clientLastReadAt.getTime();
  });

  return NextResponse.json({
    data: {
      hasUnread: unreadContact || unreadClaims.length > 0,
      unreadContact,
      unreadClaimsCount: unreadClaims.length,
    },
  });
}
