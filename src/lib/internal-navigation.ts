export type InternalSpaceId =
  | "law_firm"
  | "direction"
  | "collaborateur"
  | "investment"
  | "assurance"
  | "client";

export type SpaceModule = {
  id: string;
  label: string;
  href: string;
};

export type InternalSpace = {
  id: InternalSpaceId;
  label: string;
  permission: string;
  icon: "briefcase" | "shield" | "users" | "chart" | "heart" | "home";
  basePaths: string[];
  defaultHref: string;
  modules: SpaceModule[];
};

export const INTERNAL_SPACES: InternalSpace[] = [
  {
    id: "law_firm",
    label: "Espace Avocat",
    permission: "space:law_firm",
    icon: "briefcase",
    basePaths: ["/cabinet/espace"],
    defaultHref: "/cabinet/espace",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/cabinet/espace" },
      { id: "cases", label: "Dossiers", href: "/cabinet/espace#law-firm-matters" },
      { id: "tasks", label: "Taches", href: "/cabinet/espace#law-firm-tasks" },
      { id: "billing", label: "Facturation", href: "/cabinet/espace#law-firm-invoice-form" },
      { id: "documents", label: "Generateur de documents", href: "/cabinet/espace#law-firm-documents" },
      { id: "activity", label: "Activite", href: "/cabinet/espace#law-firm-activity" },
    ],
  },
  {
    id: "direction",
    label: "Espace Direction",
    permission: "space:direction",
    icon: "shield",
    basePaths: ["/admin"],
    defaultHref: "/admin",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/admin" },
      { id: "settings", label: "Parametres", href: "/admin/parametres" },
      { id: "users_roles", label: "Utilisateurs & Roles", href: "/admin/parametres#settings-users-roles" },
      { id: "permissions", label: "Permissions", href: "/admin/parametres#settings-permissions" },
      { id: "audit", label: "Journal d'audit", href: "/admin#audit-trail" },
      { id: "notifications", label: "Notifications", href: "/admin#notifications-feed" },
      { id: "reports", label: "Rapports", href: "/admin#performance-reports" },
    ],
  },
  {
    id: "investment",
    label: "Investment",
    permission: "space:investment",
    icon: "chart",
    basePaths: ["/investment/dashboard"],
    defaultHref: "/investment/dashboard",
    modules: [
      { id: "dashboard", label: "Tableau de bord", href: "/investment/dashboard" },
    ],
  },
  {
    id: "collaborateur",
    label: "Espace Collaborateur",
    permission: "space:collaborateur",
    icon: "users",
    basePaths: ["/collaborateur"],
    defaultHref: "/collaborateur",
    modules: [
      { id: "clients", label: "Clients", href: "/collaborateur?tab=CLIENTS" },
      { id: "claims", label: "Sinistres", href: "/collaborateur?tab=CLAIMS" },
      { id: "requests", label: "Souscriptions", href: "/collaborateur?tab=REQUESTS" },
      { id: "billing", label: "Facturation", href: "/collaborateur?tab=BILLING" },
      { id: "contact", label: "Contact", href: "/collaborateur?tab=CONTACT" },
    ],
  },
  {
    id: "assurance",
    label: "Assurance",
    permission: "space:client",
    icon: "heart",
    basePaths: ["/assurances/dashboard"],
    defaultHref: "/assurances/dashboard",
    modules: [{ id: "dashboard", label: "Tableau de bord", href: "/assurances/dashboard" }],
  },
  {
    id: "client",
    label: "Mon espace",
    permission: "space:client",
    icon: "home",
    basePaths: ["/client"],
    defaultHref: "/client",
    modules: [{ id: "dashboard", label: "Tableau de bord", href: "/client" }],
  },
];

export function isInternalPath(pathname: string) {
  return INTERNAL_SPACES.some((space) => space.basePaths.some((path) => pathname.startsWith(path)));
}

export function getActiveSpace(pathname: string, visibleSpaces: InternalSpace[]) {
  return (
    visibleSpaces.find((space) => space.basePaths.some((path) => pathname.startsWith(path))) ??
    visibleSpaces[0] ??
    null
  );
}
