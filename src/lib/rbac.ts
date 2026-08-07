export type AppRole = "PUBLIC" | "CLIENT" | "COLLABORATOR" | "ADMIN";
export type AppService = "assurance" | "investment" | "law_firm";

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
  { label: "Espace Investment", href: "/investment/dashboard", minRole: "CLIENT" },
  { label: "Espace Collaborateur", href: "/collaborateur", minRole: "COLLABORATOR" },
  { label: "Espace Law Firm", href: "/cabinet/espace", minRole: "COLLABORATOR" },
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
  return protectedSpaces.filter((space) => hasRequiredRole(role, space.minRole));
}

export function getServiceSpaceForRole(role: AppRole, service: AppService) {
  if (service === "investment") {
    if (hasRequiredRole(role, "CLIENT")) {
      return "/investment/dashboard";
    }

    return "/";
  }

  if (service === "law_firm") {
    if (hasRequiredRole(role, "COLLABORATOR")) {
      return "/cabinet/espace";
    }

    return "/";
  }

  return getDefaultSpaceForRole(role);
}
