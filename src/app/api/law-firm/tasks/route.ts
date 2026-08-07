import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const taskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

const taskSchema = z.object({
  matterId: z.string().uuid(),
  title: z.string().min(3).max(180),
  description: z.string().max(4000).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
});

const updateSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(3).max(180).optional(),
  description: z.string().max(4000).optional().nullable(),
  status: z.enum(taskStatuses).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  action: z.enum(["update", "delete"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.tasks");
  if (!auth.ok) {
    return auth.response;
  }

  const matterId = request.nextUrl.searchParams.get("matterId") ?? undefined;
  const tasks = await prisma.lawMatterTask.findMany({
    where: matterId ? { matterId } : undefined,
    include: {
      matter: { select: { id: true, title: true, matterNumber: true } },
      assignee: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ data: tasks });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.tasks");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.lawMatterTask.create({
    data: {
      matterId: parsed.data.matterId,
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assigneeId: parsed.data.assigneeId ?? null,
      createdById: auth.user.id,
    },
  });

  await prisma.lawMatter.update({ where: { id: parsed.data.matterId }, data: { lastActivityAt: new Date() } });
  return NextResponse.json({ data: task }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("module:law_firm.tasks");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "delete") {
    await prisma.lawMatterTask.delete({ where: { id: parsed.data.taskId } });
    return NextResponse.json({ success: true });
  }

  const updated = await prisma.lawMatterTask.update({
    where: { id: parsed.data.taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      dueDate: parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assigneeId: parsed.data.assigneeId === undefined ? undefined : parsed.data.assigneeId,
      completedAt: parsed.data.status === "DONE" ? new Date() : undefined,
    },
  });

  await prisma.lawMatter.update({ where: { id: updated.matterId }, data: { lastActivityAt: new Date() } });
  return NextResponse.json({ data: updated });
}
