export type InternalSpaceId =
  | "law_firm"
  | "direction"
  | "collaborateur"
  | "investment"
  | "assurance"
  | "finance"
  | "client";

export type SpaceModule = {
  id: string;
  label: string;
  href: string;
  /** `false` for placeholder screens: kept routable but hidden from navigation. */
  implemented?: boolean;
};

export type InternalSpace = {
  id: InternalSpaceId;
  label: string;
  permission: string;
  icon: "briefcase" | "shield" | "users" | "chart" | "heart" | "home";
  basePaths: string[];
  defaultHref: string;
  modules: SpaceModule[];
  /** `false` while the whole space is still a placeholder. */
  implemented?: boolean;
};

type SpaceResolutionInput = {
  permissions?: string[];
  role?: string;
  pathname: string;
};

function hasPermission(permissions: string[] | undefined, permissionKey: string) {
  if (!permissions || permissions.length === 0) {
    return false;
  }

  return permissions.includes("*") || permissions.includes(permissionKey);
}

export const INTERNAL_SPACES: InternalSpace[] = [
  {
    id: "law_firm",
    label: "Espace Avocat",
    permission: "space:law_firm",
    icon: "briefcase",
    basePaths: ["/law", "/cabinet/espace"],
    defaultHref: "/law/dashboard",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/law/dashboard" },
      { id: "cases", label: "Dossiers", href: "/law/cases" },
      { id: "clients", label: "Clients", href: "/law/clients" },
      { id: "tasks", label: "Taches", href: "/law/tasks" },
      { id: "billing", label: "Facturation", href: "/law/billing" },
      { id: "document-generator", label: "Generateur de documents", href: "/law/document-generator" },
      { id: "library", label: "Bibliotheque", href: "/law/library" },
      { id: "trainings", label: "Formations", href: "/law/trainings" },
      { id: "bar-exam", label: "Examen Barreau", href: "/law/bar-exam" },
      { id: "disciplinary", label: "Disciplinaire", href: "/law/disciplinary" },
      { id: "profile", label: "Mon espace", href: "/law/profile" },
    ],
  },
  {
    id: "direction",
    label: "Espace Direction",
    permission: "space:direction",
    icon: "shield",
    basePaths: ["/direction", "/admin"],
    defaultHref: "/direction/dashboard",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/direction/dashboard" },
      { id: "settings", label: "Parametres", href: "/direction/settings" },
      { id: "users_roles", label: "Utilisateurs & Roles", href: "/direction/users-roles" },
      { id: "permissions", label: "Permissions", href: "/direction/permissions" },
      { id: "audit", label: "Journal d'audit", href: "/direction/audit" },
      { id: "notifications", label: "Notifications", href: "/direction/notifications" },
      { id: "reports", label: "Rapports", href: "/direction/reports" },
      { id: "profile", label: "Mon espace", href: "/direction/profile" },
    ],
  },
  {
    id: "investment",
    label: "Investment",
    permission: "space:investment",
    icon: "chart",
    basePaths: ["/investment"],
    defaultHref: "/investment/dashboard",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/investment/dashboard" },
      { id: "portfolio", label: "Portefeuille", href: "/investment/portfolio", implemented: false },
      { id: "analytics", label: "Analytique", href: "/investment/analytics", implemented: false },
      { id: "requests", label: "Demandes", href: "/investment/requests", implemented: false },
      { id: "profile", label: "Mon espace", href: "/investment/profile", implemented: false },
    ],
  },
  {
    id: "collaborateur",
    label: "RH",
    permission: "space:collaborateur",
    icon: "users",
    basePaths: ["/rh", "/collaborateur"],
    defaultHref: "/rh/dashboard",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/rh/dashboard" },
      { id: "clients", label: "Clients", href: "/rh/clients" },
      { id: "claims", label: "Sinistres", href: "/rh/claims" },
      { id: "requests", label: "Souscriptions", href: "/rh/requests" },
      { id: "billing", label: "Facturation", href: "/rh/billing" },
      { id: "contact", label: "Contact", href: "/rh/contact" },
      { id: "profile", label: "Mon espace", href: "/rh/profile" },
    ],
  },
  {
    id: "assurance",
    label: "Assurance",
    permission: "space:client",
    icon: "heart",
    basePaths: ["/assurance", "/assurances/dashboard"],
    defaultHref: "/assurance/dashboard",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/assurance/dashboard" },
      { id: "contracts", label: "Contrats", href: "/assurance/contracts", implemented: false },
      { id: "claims", label: "Sinistres", href: "/assurance/claims", implemented: false },
      { id: "billing", label: "Facturation", href: "/assurance/billing", implemented: false },
      { id: "support", label: "Support", href: "/assurance/support", implemented: false },
      { id: "profile", label: "Mon espace", href: "/assurance/profile", implemented: false },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    permission: "space:direction",
    icon: "chart",
    basePaths: ["/finance"],
    defaultHref: "/finance/dashboard",
    implemented: false,
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/finance/dashboard", implemented: false },
      { id: "billing", label: "Facturation", href: "/finance/billing", implemented: false },
      { id: "treasury", label: "Tresorerie", href: "/finance/treasury", implemented: false },
      { id: "reports", label: "Rapports", href: "/finance/reports", implemented: false },
      { id: "profile", label: "Mon espace", href: "/finance/profile", implemented: false },
    ],
  },
  {
    id: "client",
    label: "Mon espace",
    permission: "space:client",
    icon: "home",
    basePaths: ["/client-space", "/client"],
    defaultHref: "/client-space/overview",
    modules: [
      { id: "overview", label: "Vue d'ensemble", href: "/client-space/overview" },
      { id: "contracts", label: "Contrats", href: "/client-space/contracts" },
      { id: "claims", label: "Sinistres", href: "/client-space/claims" },
      { id: "matters", label: "Dossiers", href: "/client-space/matters" },
      { id: "messages", label: "Messages", href: "/client-space/messages" },
      { id: "requests", label: "Souscriptions", href: "/client-space/requests" },
      { id: "billing", label: "Facturation", href: "/client-space/billing" },
    ],
  },
];

export function isInternalPath(pathname: string) {
  return INTERNAL_SPACES.some((space) => space.basePaths.some((path) => pathname.startsWith(path)));
}

export function isSpaceImplemented(space: InternalSpace) {
  return space.implemented !== false;
}

export function getImplementedModules(space: InternalSpace) {
  return space.modules.filter((module) => module.implemented !== false);
}

export function getActiveSpace(pathname: string, visibleSpaces: InternalSpace[]) {
  return (
    visibleSpaces.find((space) => space.basePaths.some((path) => pathname.startsWith(path))) ??
    visibleSpaces[0] ??
    null
  );
}

export function getActiveModule(pathname: string, visibleSpaces: InternalSpace[]) {
  const activeSpace = getActiveSpace(pathname, visibleSpaces);
  if (!activeSpace) {
    return null;
  }

  return activeSpace.modules.find((module) => module.href === pathname) ?? null;
}

function roleDefaultSpaceIds(role?: string): InternalSpaceId[] {
  if (!role) {
    return [];
  }

  if (role === "ADMIN") {
    return ["direction", "law_firm", "collaborateur", "investment", "assurance", "finance", "client"];
  }

  if (role === "COLLABORATOR") {
    return ["law_firm", "collaborateur", "investment", "assurance", "client"];
  }

  if (role === "CLIENT") {
    return ["client", "assurance", "investment"];
  }

  return [];
}

export function resolveAccessibleSpaces({ permissions, role, pathname }: SpaceResolutionInput) {
  const fromPermissions = INTERNAL_SPACES.filter((space) => hasPermission(permissions, space.permission));
  const fromRole = roleDefaultSpaceIds(role)
    .map((id) => INTERNAL_SPACES.find((space) => space.id === id) ?? null)
    .filter((space): space is InternalSpace => Boolean(space));
  const matchedByRoute = INTERNAL_SPACES.find((space) => space.basePaths.some((path) => pathname.startsWith(path))) ?? null;

  const mergedById = new Map<InternalSpaceId, InternalSpace>();
  [...fromPermissions, ...fromRole, ...(matchedByRoute ? [matchedByRoute] : [])].forEach((space) => {
    mergedById.set(space.id, space);
  });

  return [...mergedById.values()].filter(isSpaceImplemented);
}
