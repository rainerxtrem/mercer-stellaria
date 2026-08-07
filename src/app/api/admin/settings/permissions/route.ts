import { PermissionResourceType, RouteMatchType } from "@/generated/prisma/enums";
import { ensureRbacBootstrap } from "@/lib/grade-permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createResourceSchema = z.object({
  type: z.literal("resource"),
  key: z.string().regex(/^[a-z0-9._:-]+$/),
  label: z.string().min(2),
  resourceType: z.enum([PermissionResourceType.SPACE, PermissionResourceType.PAGE, PermissionResourceType.MODULE, PermissionResourceType.ACTION, PermissionResourceType.FEATURE]),
  description: z.string().optional(),
});

const createRouteBindingSchema = z.object({
  type: z.literal("route"),
  pattern: z.string().min(1),
  matchType: z.enum([RouteMatchType.EXACT, RouteMatchType.PREFIX, RouteMatchType.REGEXP]),
  resourceId: z.string().uuid(),
  isEnabled: z.boolean().optional(),
});

const updatePermissionSchema = z.object({
  type: z.literal("grade-permission"),
  gradeId: z.string().uuid(),
  resourceId: z.string().uuid(),
  enabled: z.boolean(),
});

const updateRouteSchema = z.object({
  type: z.literal("route"),
  id: z.string().uuid(),
  pattern: z.string().min(1).optional(),
  matchType: z.enum([RouteMatchType.EXACT, RouteMatchType.PREFIX, RouteMatchType.REGEXP]).optional(),
  resourceId: z.string().uuid().optional(),
  isEnabled: z.boolean().optional(),
});

const deleteSchema = z.object({
  type: z.enum(["resource", "route"]),
  id: z.string().uuid(),
});

export async function GET() {
  const auth = await requirePermission("module:settings.permissions");
  if (!auth.ok) {
    return auth.response;
  }

  await ensureRbacBootstrap();

  const [grades, resources, permissions, routeBindings] = await Promise.all([
    prisma.grade.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        rank: true,
      },
      orderBy: { rank: "asc" },
    }),
    prisma.permissionResource.findMany({
      select: {
        id: true,
        key: true,
        label: true,
        type: true,
        description: true,
      },
      orderBy: [{ type: "asc" }, { key: "asc" }],
    }),
    prisma.gradePermission.findMany({
      select: {
        gradeId: true,
        resourceId: true,
      },
    }),
    prisma.routePermissionBinding.findMany({
      select: {
        id: true,
        pattern: true,
        matchType: true,
        isEnabled: true,
        resourceId: true,
        resource: {
          select: {
            key: true,
            label: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    data: {
      grades,
      resources,
      permissions,
      routeBindings,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("feature:settings.permissions.routes");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();

  const resourceParsed = createResourceSchema.safeParse(body);
  if (resourceParsed.success) {
    const resource = await prisma.permissionResource.create({
      data: {
        key: resourceParsed.data.key,
        label: resourceParsed.data.label,
        type: resourceParsed.data.resourceType,
        description: resourceParsed.data.description,
      },
    });

    return NextResponse.json({ data: resource }, { status: 201 });
  }

  const routeParsed = createRouteBindingSchema.safeParse(body);
  if (routeParsed.success) {
    const binding = await prisma.routePermissionBinding.create({
      data: {
        pattern: routeParsed.data.pattern,
        matchType: routeParsed.data.matchType,
        resourceId: routeParsed.data.resourceId,
        isEnabled: routeParsed.data.isEnabled ?? true,
      },
      select: {
        id: true,
        pattern: true,
        matchType: true,
        isEnabled: true,
        resourceId: true,
      },
    });

    return NextResponse.json({ data: binding }, { status: 201 });
  }

  return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("module:settings.permissions");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();

  const permissionParsed = updatePermissionSchema.safeParse(body);
  if (permissionParsed.success) {
    const { gradeId, resourceId, enabled } = permissionParsed.data;

    if (enabled) {
      await prisma.gradePermission.upsert({
        where: {
          gradeId_resourceId: { gradeId, resourceId },
        },
        update: {},
        create: { gradeId, resourceId },
      });
    } else {
      await prisma.gradePermission.deleteMany({
        where: {
          gradeId,
          resourceId,
        },
      });
    }

    return NextResponse.json({ success: true });
  }

  const routeParsed = updateRouteSchema.safeParse(body);
  if (routeParsed.success) {
    const updated = await prisma.routePermissionBinding.update({
      where: { id: routeParsed.data.id },
      data: {
        pattern: routeParsed.data.pattern,
        matchType: routeParsed.data.matchType,
        resourceId: routeParsed.data.resourceId,
        isEnabled: routeParsed.data.isEnabled,
      },
      select: {
        id: true,
        pattern: true,
        matchType: true,
        isEnabled: true,
        resourceId: true,
      },
    });

    return NextResponse.json({ data: updated });
  }

  return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission("feature:settings.permissions.routes");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.type === "resource") {
    await prisma.permissionResource.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ success: true });
  }

  await prisma.routePermissionBinding.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ success: true });
}
