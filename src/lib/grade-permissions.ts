import { PermissionResourceType, RouteMatchType, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const SYSTEM_GRADES = [
  { code: "CHIEF_EXECUTIVE_OFFICER", name: "Chief Executive Officer", rank: 1 },
  { code: "CHIEF_HUMAN_RESOURCES_OFFICER", name: "Chief Human Resources Officer", rank: 2 },
  { code: "CHIEF_FINANCIAL_OFFICER", name: "Chief Financial Officer", rank: 3 },
  { code: "MANAGING_DIRECTOR", name: "Managing Director", rank: 4 },
  { code: "PARTNER", name: "Partner", rank: 5 },
  { code: "SENIOR_ASSOCIATE", name: "Senior Associate", rank: 6 },
  { code: "ASSOCIATE", name: "Associate", rank: 7 },
  { code: "JUNIOR_ASSOCIATE", name: "Junior Associate", rank: 8 },
  { code: "PARALEGAL", name: "Paralegal", rank: 9 },
  { code: "CLAIMS_MANAGER", name: "Claims Manager", rank: 10 },
  { code: "INVESTIGATOR", name: "Investigator", rank: 11 },
  { code: "INSURANCE_AGENT", name: "Insurance Agent", rank: 12 },
  { code: "ADMINISTRATIVE_ASSISTANT", name: "Administrative Assistant", rank: 13 },
] as const;

export const DEFAULT_PERMISSION_RESOURCES = [
  { key: "space:client", label: "Espace Client", type: PermissionResourceType.SPACE },
  { key: "space:collaborateur", label: "Espace Collaborateur", type: PermissionResourceType.SPACE },
  { key: "space:direction", label: "Espace Direction", type: PermissionResourceType.SPACE },
  { key: "space:investment", label: "Espace Investment", type: PermissionResourceType.SPACE },
  { key: "space:law_firm", label: "Espace Law Firm", type: PermissionResourceType.SPACE },
  { key: "page:admin.dashboard", label: "Page Direction Dashboard", type: PermissionResourceType.PAGE },
  { key: "page:admin.settings", label: "Page Parametres Direction", type: PermissionResourceType.PAGE },
  { key: "page:law_firm.workspace", label: "Page Espace Law Firm", type: PermissionResourceType.PAGE },
  { key: "module:settings.users_roles", label: "Module Utilisateurs et Roles", type: PermissionResourceType.MODULE },
  { key: "module:settings.permissions", label: "Module Permissions", type: PermissionResourceType.MODULE },
  { key: "module:law_firm.cases", label: "Module Dossiers Law Firm", type: PermissionResourceType.MODULE },
  { key: "module:law_firm.documents", label: "Module Documents Law Firm", type: PermissionResourceType.MODULE },
  { key: "module:law_firm.billing", label: "Module Facturation Law Firm", type: PermissionResourceType.MODULE },
  { key: "module:law_firm.tasks", label: "Module Taches Law Firm", type: PermissionResourceType.MODULE },
  { key: "module:law_firm.search", label: "Module Recherche Law Firm", type: PermissionResourceType.MODULE },
  { key: "action:read", label: "Action lecture", type: PermissionResourceType.ACTION },
  { key: "action:create", label: "Action creation", type: PermissionResourceType.ACTION },
  { key: "action:update", label: "Action modification", type: PermissionResourceType.ACTION },
  { key: "action:delete", label: "Action suppression", type: PermissionResourceType.ACTION },
  { key: "action:validate", label: "Action validation", type: PermissionResourceType.ACTION },
  { key: "action:export", label: "Action export", type: PermissionResourceType.ACTION },
  { key: "action:admin", label: "Action administration", type: PermissionResourceType.ACTION },
  { key: "feature:settings.permissions.routes", label: "Gestion des regles de routes", type: PermissionResourceType.FEATURE },
  { key: "feature:law_firm.signature", label: "Signature Law Firm", type: PermissionResourceType.FEATURE },
] as const;

export const DEFAULT_ROUTE_BINDINGS = [
  { pattern: "/client", matchType: RouteMatchType.PREFIX, resourceKey: "space:client" },
  { pattern: "/collaborateur", matchType: RouteMatchType.PREFIX, resourceKey: "space:collaborateur" },
  { pattern: "/investment/dashboard", matchType: RouteMatchType.PREFIX, resourceKey: "space:investment" },
  { pattern: "/assurances/dashboard", matchType: RouteMatchType.PREFIX, resourceKey: "space:client" },
  { pattern: "/admin", matchType: RouteMatchType.PREFIX, resourceKey: "space:direction" },
  { pattern: "/admin/parametres", matchType: RouteMatchType.PREFIX, resourceKey: "page:admin.settings" },
  { pattern: "/api/admin/settings/users-roles", matchType: RouteMatchType.PREFIX, resourceKey: "module:settings.users_roles" },
  { pattern: "/api/admin/settings/permissions", matchType: RouteMatchType.PREFIX, resourceKey: "module:settings.permissions" },
  { pattern: "/cabinet/espace", matchType: RouteMatchType.PREFIX, resourceKey: "space:law_firm" },
  { pattern: "/api/law-firm", matchType: RouteMatchType.PREFIX, resourceKey: "space:law_firm" },
] as const;

export type EffectivePermissionContext = {
  role: UserRole | "PUBLIC";
  grades: string[];
  permissions: string[];
};

export async function ensureRbacBootstrap() {
  await Promise.all(
    SYSTEM_GRADES.map((grade) =>
      prisma.grade.upsert({
        where: { code: grade.code },
        update: { name: grade.name, rank: grade.rank, isSystem: true },
        create: { code: grade.code, name: grade.name, rank: grade.rank, isSystem: true },
      }),
    ),
  );

  await Promise.all(
    DEFAULT_PERMISSION_RESOURCES.map((resource) =>
      prisma.permissionResource.upsert({
        where: { key: resource.key },
        update: { label: resource.label, type: resource.type },
        create: { key: resource.key, label: resource.label, type: resource.type },
      }),
    ),
  );

  const resources = await prisma.permissionResource.findMany({
    where: {
      key: { in: DEFAULT_ROUTE_BINDINGS.map((binding) => binding.resourceKey) },
    },
    select: { id: true, key: true },
  });

  const allResources = await prisma.permissionResource.findMany({
    select: { id: true },
  });

  const byKey = new Map(resources.map((resource) => [resource.key, resource.id]));

  await Promise.all(
    DEFAULT_ROUTE_BINDINGS.map((binding) => {
      const resourceId = byKey.get(binding.resourceKey);
      if (!resourceId) {
        return Promise.resolve(null);
      }

      return prisma.routePermissionBinding.upsert({
        where: {
          matchType_pattern_resourceId: {
            matchType: binding.matchType,
            pattern: binding.pattern,
            resourceId,
          },
        },
        update: { isEnabled: true },
        create: {
          matchType: binding.matchType,
          pattern: binding.pattern,
          resourceId,
          isEnabled: true,
        },
      });
    }),
  );

  // Migration cleanup: remove legacy catch-all settings route binding.
  await prisma.routePermissionBinding.deleteMany({
    where: {
      pattern: "/api/admin/settings",
      matchType: RouteMatchType.PREFIX,
    },
  });

  const ceo = await prisma.grade.findUnique({ where: { code: "CHIEF_EXECUTIVE_OFFICER" }, select: { id: true } });

  if (ceo) {
    await Promise.all(
      allResources.map((resource) =>
        prisma.gradePermission.upsert({
          where: {
            gradeId_resourceId: {
              gradeId: ceo.id,
              resourceId: resource.id,
            },
          },
          update: {},
          create: {
            gradeId: ceo.id,
            resourceId: resource.id,
          },
        }),
      ),
    );
  }
}

export async function getEffectivePermissionContext(userId: string): Promise<EffectivePermissionContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      userGrades: {
        select: {
          grade: {
            select: {
              name: true,
              code: true,
              permissions: {
                select: {
                  resource: { select: { key: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { role: "PUBLIC", grades: [], permissions: [] };
  }

  const gradeCodes = user.userGrades.map((entry) => entry.grade.code);
  const permissionKeys = new Set<string>();

  user.userGrades.forEach((entry) => {
    entry.grade.permissions.forEach((permission) => permissionKeys.add(permission.resource.key));
  });

  // Keep backward compatibility with legacy role-based access for users
  // that have not received explicit grades yet.
  if (user.role === UserRole.CLIENT) {
    permissionKeys.add("space:client");
    permissionKeys.add("space:investment");
  }

  if (user.role === UserRole.COLLABORATOR) {
    permissionKeys.add("space:client");
    permissionKeys.add("space:investment");
    permissionKeys.add("space:collaborateur");
    permissionKeys.add("space:law_firm");
  }

  if (user.role === UserRole.ADMIN) {
    permissionKeys.add("space:client");
    permissionKeys.add("space:investment");
    permissionKeys.add("space:collaborateur");
    permissionKeys.add("space:direction");
    permissionKeys.add("space:law_firm");
    permissionKeys.add("page:admin.settings");
    permissionKeys.add("module:settings.users_roles");
    permissionKeys.add("module:settings.permissions");
    permissionKeys.add("feature:settings.permissions.routes");
    permissionKeys.add("page:law_firm.workspace");
    permissionKeys.add("module:law_firm.cases");
    permissionKeys.add("module:law_firm.documents");
    permissionKeys.add("module:law_firm.billing");
    permissionKeys.add("module:law_firm.tasks");
    permissionKeys.add("module:law_firm.search");
    permissionKeys.add("feature:law_firm.signature");
  }

  if (gradeCodes.includes("CHIEF_EXECUTIVE_OFFICER")) {
    permissionKeys.add("*");
  }

  return {
    role: user.role,
    grades: gradeCodes,
    permissions: [...permissionKeys],
  };
}

export function inferRoleFromPermissions(baseRole: UserRole, permissions: string[]) {
  const hasAll = permissions.includes("*");
  const hasDirection = hasAll || permissions.includes("space:direction");
  const hasCollaborator = hasAll || permissions.includes("space:collaborateur");
  const hasClient = hasAll || permissions.includes("space:client") || permissions.includes("space:investment");

  if (hasDirection) {
    return UserRole.ADMIN;
  }

  if (hasCollaborator) {
    return UserRole.COLLABORATOR;
  }

  if (hasClient) {
    return UserRole.CLIENT;
  }

  return baseRole;
}

export function hasPermission(permissionKeys: string[] | undefined, permissionKey: string) {
  if (!permissionKeys || permissionKeys.length === 0) {
    return false;
  }

  return permissionKeys.includes("*") || permissionKeys.includes(permissionKey);
}
