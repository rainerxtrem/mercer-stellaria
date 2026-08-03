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

export async function GET(request: NextRequest) {
  try {
    const contactModel = (prisma as unknown as { contactMessage?: typeof prisma.contactMessage }).contactMessage;
    const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;
    const conversationStateOps = conversationStateModel as unknown as {
      findUnique: (args: unknown) => Promise<{ clientArchivedAt: Date | null; staffArchivedAt: Date | null } | null>;
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
          select: { clientArchivedAt: true, staffArchivedAt: true },
        })
      : null;

    const isArchivedForViewer = isCounselor(persistedUser.role)
      ? Boolean(conversationState?.staffArchivedAt)
      : false;

    const targetClient = await prisma.user.findUnique({
      where: { id: resolvedClientId },
      select: { id: true },
    });

    if (!targetClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (isArchivedForViewer) {
      return NextResponse.json({ data: [] });
    }

    if (!peek && conversationStateModel) {
      await conversationStateOps.upsert({
        where: { clientId: resolvedClientId },
        create: {
          clientId: resolvedClientId,
          staffLastReadAt: isCounselor(persistedUser.role) ? new Date() : null,
          clientLastReadAt: isCounselor(persistedUser.role) ? null : new Date(),
        },
        update: isCounselor(persistedUser.role)
          ? { staffLastReadAt: new Date() }
          : { clientLastReadAt: new Date() },
      });
    }

    if (isCounselor(persistedUser.role)) {
      const where = { clientId: resolvedClientId };
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

      return NextResponse.json({ data: messages });
    }

    const messages = await contactModel.findMany({
      where: { clientId: resolvedClientId },
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

    const senderName =
      [persistedUser.firstName, persistedUser.lastName].filter(Boolean).join(" ").trim() ||
      persistedUser.fullName ||
      persistedUser.email ||
      "Utilisateur";

    const message = await contactModel.create({
      data: {
        clientId: finalTargetClientId,
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

    if (conversationStateModel) {
      await conversationStateOps.upsert({
        where: { clientId: finalTargetClientId },
        create: {
          clientId: finalTargetClientId,
          staffLastReadAt: isCounselor(persistedUser.role) ? new Date() : null,
          clientLastReadAt: isCounselor(persistedUser.role) ? null : new Date(),
          clientArchivedAt: null,
          staffArchivedAt: null,
        },
        update: isCounselor(persistedUser.role)
          ? { staffLastReadAt: new Date(), clientArchivedAt: null, staffArchivedAt: null }
          : { clientLastReadAt: new Date(), clientArchivedAt: null, staffArchivedAt: null },
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

export async function DELETE(request: NextRequest) {
  try {
    const conversationStateModel = (prisma as unknown as { contactConversationState?: typeof prisma.contactConversationState }).contactConversationState;
    const conversationStateOps = conversationStateModel as unknown as {
      upsert: (args: unknown) => Promise<unknown>;
    };
    if (!conversationStateModel) {
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

    if (!isCounselor(persistedUser.role)) {
      return NextResponse.json({ error: "Seul un conseiller peut cloturer la discussion." }, { status: 403 });
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

    await conversationStateOps.upsert({
      where: { clientId: resolvedTarget.clientId },
      create: {
        clientId: resolvedTarget.clientId,
        clientArchivedAt: new Date(),
        staffArchivedAt: new Date(),
      },
      update: {
        clientArchivedAt: new Date(),
        staffArchivedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de clôturer la discussion." },
      { status: 500 },
    );
  }
}
