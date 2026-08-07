import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { createAppNotificationSafe } from "@/lib/app-notifications";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createMessageSchema = z.object({
  body: z.string().min(2),
  documentLink: z.string().url().optional(),
  signatureLink: z.string().url().optional(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const matter = await prisma.lawMatter.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
      participants: { select: { clientId: true } },
    },
  });

  if (!matter) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  const isStaff = currentUser.role === "ADMIN" || currentUser.role === "COLLABORATOR";
  const isParticipant = matter.clientId === currentUser.id || matter.participants.some((participant) => participant.clientId === currentUser.id);

  if (!isStaff && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.lawMatterMessage.findMany({
    where: { matterId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: messages });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const matter = await prisma.lawMatter.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
      title: true,
      participants: { select: { clientId: true } },
    },
  });

  if (!matter) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  const isStaff = currentUser.role === "ADMIN" || currentUser.role === "COLLABORATOR";
  const isParticipant = matter.clientId === currentUser.id || matter.participants.some((participant) => participant.clientId === currentUser.id);

  if (!isStaff && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await prisma.lawMatterMessage.create({
    data: {
      matterId: matter.id,
      senderId: currentUser.id,
      senderRole: currentUser.role as never,
      senderName: currentUser.email ?? "Utilisateur",
      body: parsed.data.body,
      documentLink: parsed.data.documentLink,
      signatureLink: parsed.data.signatureLink,
    },
  });

  await prisma.lawMatter.update({
    where: { id: matter.id },
    data: { lastActivityAt: new Date() },
  });

  if (currentUser.role !== "CLIENT") {
    await createAppNotificationSafe({
      recipientId: matter.clientId,
      type: NotificationType.MESSAGE,
      severity: NotificationSeverity.INFO,
      title: `Nouveau message sur ${matter.title}`,
      body: parsed.data.body,
      link: parsed.data.signatureLink ?? "/cabinet/espace",
    });
  }

  return NextResponse.json({ data: message }, { status: 201 });
}
