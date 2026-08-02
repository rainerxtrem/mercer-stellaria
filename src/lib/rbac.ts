export type AppRole = "PUBLIC" | "CLIENT" | "COLLABORATOR" | "ADMIN";

export type AppSpace = {
  label: string;
  href: string;
  minRole: AppRole;
};

const roleHierarchy: Record<AppRole, number> = {
  PUBLIC: 0,
  CLIENT: 1,
  COLLABORATOR: 2,
  ADMIN: 3,
};

const protectedSpaces: AppSpace[] = [
  { label: "Espace Client", href: "/client", minRole: "CLIENT" },
  { label: "Espace Collaborateur", href: "/collaborateur", minRole: "COLLABORATOR" },
  { label: "Espace Direction", href: "/admin", minRole: "ADMIN" },
];

export function hasRequiredRole(userRole: AppRole, requiredRole: AppRole) {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function getDefaultSpaceForRole(role: AppRole) {
  if (hasRequiredRole(role, "ADMIN")) {
    return "/admin";
  }

  if (hasRequiredRole(role, "COLLABORATOR")) {
    return "/collaborateur";
  }

  if (hasRequiredRole(role, "CLIENT")) {
    return "/client";
  }

  return "/";
}

export function getAccessibleSpaces(role: AppRole) {
  if (role === "ADMIN") {
    return protectedSpaces.filter((space) => space.minRole === "ADMIN");
  }

  if (role === "COLLABORATOR") {
    return protectedSpaces.filter((space) => space.minRole === "COLLABORATOR");
  }

  if (role === "CLIENT") {
    return protectedSpaces.filter((space) => space.minRole === "CLIENT");
  }

  return [];
}
