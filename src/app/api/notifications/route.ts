import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

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
          where: { senderRole: UserRole.CLIENT },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        claims: {
          select: {
            staffLastReadAt: true,
            messages: {
              where: { senderRole: UserRole.CLIENT },
              select: { createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 1,
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
      const latestClientContactMessage = client.clientContactMessages[0];
      const hasUnreadContact = Boolean(
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

      return hasUnreadContact || hasUnreadClaimMessage;
    });

    const notifications = await prisma.appNotification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        severity: true,
        title: true,
        body: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: {
        hasUnread: unreadClients.length > 0,
        unreadClientIds: unreadClients.map((client) => client.id),
        feedUnreadCount: notifications.filter((item) => !item.isRead).length,
        notifications,
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

  const notifications = await prisma.appNotification.findMany({
    where: { recipientId: clientId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      body: true,
      link: true,
      isRead: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: {
      hasUnread: unreadContact || unreadClaims.length > 0,
      unreadContact,
      unreadClaimsCount: unreadClaims.length,
      feedUnreadCount: notifications.filter((item) => !item.isRead).length,
      notifications,
    },
  });
}

const markNotificationSchema = z.object({
  notificationId: z.string().uuid().optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === "PUBLIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = markNotificationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.markAll) {
    await prisma.appNotification.updateMany({
      where: { recipientId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  }

  if (!parsed.data.notificationId) {
    return NextResponse.json({ error: "notificationId requis." }, { status: 400 });
  }

  const target = await prisma.appNotification.findUnique({
    where: { id: parsed.data.notificationId },
    select: { id: true, recipientId: true },
  });

  if (!target || target.recipientId !== user.id) {
    return NextResponse.json({ error: "Notification introuvable." }, { status: 404 });
  }

  await prisma.appNotification.update({
    where: { id: target.id },
    data: { isRead: true, readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
