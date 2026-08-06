import { NotificationSeverity, NotificationType, UserRole } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { optionalHttpUrlSchema } from "@/lib/url-validation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createContactMessageSchema = z.object({
  clientId: z.string().uuid().optional(),
  body: z.string().min(2),
  documentLink: optionalHttpUrlSchema,
});

const closeContactConversationSchema = z.object({
  reason: z.string().trim().min(2).max(500).optional(),
});

function isCounselor(role: UserRole | "PUBLIC") {
  return role === "COLLABORATOR" || role === "ADMIN";
}

async function resolvePersistedUser(user: { id: string; role: UserRole | "PUBLIC"; email: string | null }) {
  const byId = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, fullName: true, firstName: true, lastName: true, email: true },
  });

  if (byId) {
    return byId;
  }

  if (!user.email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, role: true, fullName: true, firstName: true, lastName: true, email: true },
  });
}

async function resolveTargetClientIdForRead(user: { id: string; role: UserRole | "PUBLIC" }, rawClientId: string | null) {
  if (isCounselor(user.role)) {
    if (!rawClientId) {
      return { error: "clientId est requis pour ce role.", status: 400 as const };
    }

    const parsed = z.string().uuid().safeParse(rawClientId);
    if (!parsed.success) {
      return { error: "clientId invalide.", status: 400 as const };
    }

    return { clientId: parsed.data };
  }

  return { clientId: user.id };
}

async function resolveTargetClientIdForWrite(user: { id: string; role: UserRole | "PUBLIC" }, rawClientId: string | undefined) {
  if (isCounselor(user.role)) {
    if (!rawClientId) {
      return { error: "clientId est requis pour ce role.", status: 400 as const };
    }

    const parsed = z.string().uuid().safeParse(rawClientId);
    if (!parsed.success) {
      return { error: "clientId invalide.", status: 400 as const };
    }

    return { clientId: parsed.data };
  }

  return { clientId: user.id };
}

function createConversationId() {
  return crypto.randomUUID();
}

export async function GET(request: NextRequest) {
  try {
    const contactModel = (prisma as unknown as { contactMessage?: typeof prisma.contactMessage }).contactMessage;
    const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;
    const conversationStateOps = conversationStateModel as unknown as {
      findUnique: (args: unknown) => Promise<{ conversationId: string | null; clientArchivedAt: Date | null; staffArchivedAt: Date | null } | null>;
      upsert: (args: unknown) => Promise<unknown>;
    };
    if (!contactModel) {
      return NextResponse.json({ error: "Contact messaging not initialized. Reload server." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role === "PUBLIC") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const persistedUser = await resolvePersistedUser(user);
    if (!persistedUser) {
      return NextResponse.json({ error: "Session invalide. Reconnectez-vous." }, { status: 401 });
    }

    const clientIdParam = request.nextUrl.searchParams.get("clientId");
    const peek = request.nextUrl.searchParams.get("peek") === "1";
    const history = request.nextUrl.searchParams.get("history") === "1";

    const resolved = await resolveTargetClientIdForRead(
      { id: persistedUser.id, role: persistedUser.role },
      clientIdParam,
    );
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const resolvedClientId = resolved.clientId;

    const conversationState = conversationStateModel
      ? await conversationStateOps.findUnique({
          where: { clientId: resolvedClientId },
          select: { conversationId: true, clientArchivedAt: true, staffArchivedAt: true },
        })
      : null;

    const isArchivedForViewer = isCounselor(persistedUser.role)
      ? Boolean(conversationState?.staffArchivedAt)
      : Boolean(conversationState?.clientArchivedAt);

    const targetClient = await prisma.user.findUnique({
      where: { id: resolvedClientId },
      select: { id: true },
    });

    if (!targetClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (history) {
      const archives = await prisma.contactConversationArchive.findMany({
        where: { clientId: resolvedClientId, closedAt: { not: null } },
        orderBy: { closedAt: "desc" },
        select: {
          id: true,
          conversationId: true,
          openedAt: true,
          closedAt: true,
          handledByName: true,
          closureReason: true,
          closedByName: true,
          closedByRole: true,
        },
      });

      const conversationIds = archives.map((archive) => archive.conversationId);
      const historyMessages = conversationIds.length
        ? await contactModel.findMany({
            where: { clientId: resolvedClientId, conversationId: { in: conversationIds } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              conversationId: true,
              senderId: true,
              senderRole: true,
              senderName: true,
              body: true,
              documentLink: true,
              createdAt: true,
            },
          })
        : [];

      const groupedMessages = historyMessages.reduce<Record<string, typeof historyMessages>>((accumulator, message) => {
        const key = message.conversationId ?? "";
        accumulator[key] ??= [];
        accumulator[key].push(message);
        return accumulator;
      }, {});

      return NextResponse.json({
        data: archives.map((archive) => ({
          ...archive,
          messages: groupedMessages[archive.conversationId] ?? [],
        })),
      });
    }

    if (isArchivedForViewer) {
      return NextResponse.json({ data: [] });
    }

    if (!peek && conversationStateModel && conversationState) {
      await conversationStateOps.upsert({
        where: { clientId: resolvedClientId },
        create: {
          clientId: resolvedClientId,
          conversationId: conversationState.conversationId,
          staffLastReadAt: isCounselor(persistedUser.role) ? new Date() : null,
          clientLastReadAt: isCounselor(persistedUser.role) ? null : new Date(),
        },
        update: isCounselor(persistedUser.role)
          ? { staffLastReadAt: new Date() }
          : { clientLastReadAt: new Date() },
      });
    }

    const currentConversationId = conversationState?.conversationId ?? null;

    if (isCounselor(persistedUser.role)) {
      const where = currentConversationId ? { clientId: resolvedClientId, conversationId: currentConversationId } : { clientId: resolvedClientId };
      const messages = await contactModel.findMany({
        where,
        orderBy: { createdAt: "desc" },
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

      return NextResponse.json({ data: messages, meta: { conversationId: currentConversationId } });
    }

    const messages = await contactModel.findMany({
      where: currentConversationId ? { clientId: resolvedClientId, conversationId: currentConversationId } : { clientId: resolvedClientId },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ data: messages, meta: { conversationId: currentConversationId } });
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
    const conversationStateOps = conversationStateModel as unknown as {
      upsert: (args: unknown) => Promise<unknown>;
    };
    if (!contactModel) {
      return NextResponse.json({ error: "Contact messaging not initialized. Reload server." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role === "PUBLIC") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const persistedUser = await resolvePersistedUser(user);
    if (!persistedUser) {
      return NextResponse.json({ error: "Session invalide. Reconnectez-vous." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createContactMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const resolvedTarget = await resolveTargetClientIdForWrite(
      { id: persistedUser.id, role: persistedUser.role },
      parsed.data.clientId,
    );
    if ("error" in resolvedTarget) {
      return NextResponse.json({ error: resolvedTarget.error }, { status: resolvedTarget.status });
    }

    const finalTargetClientId = resolvedTarget.clientId;

    const targetClient = await prisma.user.findUnique({
      where: { id: finalTargetClientId },
      select: { id: true },
    });

    if (!targetClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const existingState = conversationStateModel
      ? await conversationStateModel.findUnique({
          where: { clientId: finalTargetClientId },
          select: { conversationId: true, clientArchivedAt: true, staffArchivedAt: true },
        })
      : null;

    const senderName =
      [persistedUser.firstName, persistedUser.lastName].filter(Boolean).join(" ").trim() ||
      persistedUser.fullName ||
      persistedUser.email ||
      "Utilisateur";

    const isClosedThread = Boolean(existingState?.clientArchivedAt || existingState?.staffArchivedAt);
    const conversationId = existingState && !isClosedThread && existingState.conversationId ? existingState.conversationId : createConversationId();

    const message = await contactModel.create({
      data: {
        clientId: finalTargetClientId,
        conversationId,
        senderId: persistedUser.id,
        senderRole: persistedUser.role,
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

    await prisma.contactConversationArchive.upsert({
      where: { conversationId },
      create: {
        clientId: finalTargetClientId,
        conversationId,
        openedAt: message.createdAt,
      },
      update: {},
    });

    if (conversationStateModel) {
      await conversationStateOps.upsert({
        where: { clientId: finalTargetClientId },
        create: {
          clientId: finalTargetClientId,
          conversationId,
          staffLastReadAt: isCounselor(persistedUser.role) ? new Date() : null,
          clientLastReadAt: isCounselor(persistedUser.role) ? null : new Date(),
          clientArchivedAt: null,
          staffArchivedAt: null,
        },
        update: isCounselor(persistedUser.role)
          ? { conversationId, staffLastReadAt: new Date(), clientArchivedAt: null, staffArchivedAt: null }
          : { conversationId, clientLastReadAt: new Date(), clientArchivedAt: null, staffArchivedAt: null },
      });
    }

    const recipientId = isCounselor(persistedUser.role) ? finalTargetClientId : null;
    if (recipientId) {
      await createAppNotificationSafe({
        recipientId,
        type: NotificationType.MESSAGE,
        severity: NotificationSeverity.INFO,
        title: "Nouveau message conseiller",
        body: "Un conseiller a répondu à votre conversation de contact.",
        link: "/client",
      });
    }

    await writeAuditLogSafe({
      actorId: persistedUser.id,
      actorRole: persistedUser.role,
      action: "CONTACT_MESSAGE_SENT",
      entityType: "ContactMessage",
      entityId: message.id,
      summary: `Message contact envoyé pour le client ${finalTargetClientId}`,
      details: {
        conversationId,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ data: message, meta: { conversationId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d'envoyer le message de contact." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const contactModel = (prisma as unknown as { contactMessage?: typeof prisma.contactMessage }).contactMessage;
    const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;
    const conversationStateOps = conversationStateModel as unknown as {
      upsert: (args: unknown) => Promise<unknown>;
    };
    if (!conversationStateModel || !contactModel) {
      return NextResponse.json({ error: "Contact messaging not initialized. Reload server." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role === "PUBLIC") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const persistedUser = await resolvePersistedUser(user);
    if (!persistedUser) {
      return NextResponse.json({ error: "Session invalide. Reconnectez-vous." }, { status: 401 });
    }

    if (!isCounselor(persistedUser.role) && persistedUser.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Seul un client ou un conseiller peut cloturer la discussion." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const closePayload = closeContactConversationSchema.safeParse(body);
    if (!closePayload.success) {
      return NextResponse.json({ error: closePayload.error.flatten() }, { status: 400 });
    }

    const clientIdParam = request.nextUrl.searchParams.get("clientId") ?? undefined;
    const resolvedTarget = await resolveTargetClientIdForWrite(
      { id: persistedUser.id, role: persistedUser.role },
      clientIdParam,
    );
    if ("error" in resolvedTarget) {
      return NextResponse.json({ error: resolvedTarget.error }, { status: resolvedTarget.status });
    }

    const targetClient = await prisma.user.findUnique({ where: { id: resolvedTarget.clientId }, select: { id: true } });
    if (!targetClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const currentState = await conversationStateModel.findUnique({
      where: { clientId: resolvedTarget.clientId },
      select: { conversationId: true, clientArchivedAt: true, staffArchivedAt: true },
    });

    if (!currentState?.conversationId || currentState.clientArchivedAt || currentState.staffArchivedAt) {
      return NextResponse.json({ error: "Aucune conversation active à clôturer." }, { status: 409 });
    }

    const [firstMessage, latestCounselorMessage] = await Promise.all([
      contactModel.findFirst({
        where: { clientId: resolvedTarget.clientId, conversationId: currentState.conversationId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      contactModel.findFirst({
        where: {
          clientId: resolvedTarget.clientId,
          conversationId: currentState.conversationId,
          senderRole: { in: [UserRole.COLLABORATOR, UserRole.ADMIN] },
        },
        orderBy: { createdAt: "desc" },
        select: { senderId: true, senderName: true },
      }),
    ]);

    const closerName =
      [persistedUser.firstName, persistedUser.lastName].filter(Boolean).join(" ").trim() ||
      persistedUser.fullName ||
      persistedUser.email ||
      "Utilisateur";

    const handledById = latestCounselorMessage?.senderId ?? (isCounselor(persistedUser.role) ? persistedUser.id : null);
    const handledByName = latestCounselorMessage?.senderName ?? (isCounselor(persistedUser.role) ? closerName : null);

    await prisma.contactConversationArchive.upsert({
      where: { conversationId: currentState.conversationId },
      create: {
        clientId: resolvedTarget.clientId,
        conversationId: currentState.conversationId,
        openedAt: firstMessage?.createdAt ?? new Date(),
        closedAt: new Date(),
        handledById,
        handledByName,
        closureReason: closePayload.data.reason || null,
        closedById: persistedUser.id,
        closedByRole: persistedUser.role,
        closedByName: closerName,
      },
      update: {
        closedAt: new Date(),
        handledById,
        handledByName,
        closureReason: closePayload.data.reason || null,
        closedById: persistedUser.id,
        closedByRole: persistedUser.role,
        closedByName: closerName,
      },
    });

    await conversationStateOps.upsert({
      where: { clientId: resolvedTarget.clientId },
      create: {
        clientId: resolvedTarget.clientId,
        conversationId: currentState.conversationId,
        clientArchivedAt: new Date(),
        staffArchivedAt: new Date(),
      },
      update: {
        clientArchivedAt: new Date(),
        staffArchivedAt: new Date(),
      },
    });

    await Promise.all([
      ...(isCounselor(persistedUser.role)
        ? [
            createAppNotificationSafe({
              recipientId: resolvedTarget.clientId,
              type: NotificationType.MESSAGE,
              severity: NotificationSeverity.WARNING,
              title: "Discussion clôturée",
              body: "La discussion avec votre conseiller a été clôturée.",
              link: "/client",
            }),
          ]
        : []),
      writeAuditLogSafe({
        actorId: persistedUser.id,
        actorRole: persistedUser.role,
        action: "CONTACT_CONVERSATION_CLOSED",
        entityType: "ContactConversationState",
        entityId: resolvedTarget.clientId,
        summary: `Discussion contact archivée pour le client ${resolvedTarget.clientId}`,
        details: {
          conversationId: currentState.conversationId,
          closureReason: closePayload.data.reason || null,
          handledByName,
          closedByName: closerName,
        },
        ipAddress: request.headers.get("x-forwarded-for"),
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de clôturer la discussion." },
      { status: 500 },
    );
  }
}
