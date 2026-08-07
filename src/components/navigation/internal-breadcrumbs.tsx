"use client";

import { INTERNAL_SPACES, getActiveModule, getActiveSpace } from "@/lib/internal-navigation";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

function hasPermission(permissions: string[] | undefined, permissionKey: string) {
  if (!permissions || permissions.length === 0) {
    return false;
  }
  return permissions.includes("*") || permissions.includes(permissionKey);
}

export function InternalBreadcrumbs() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const visibleSpaces = INTERNAL_SPACES.filter((space) => hasPermission(session?.user?.permissions, space.permission));
  const activeSpace = getActiveSpace(pathname, visibleSpaces);
  const activeModule = getActiveModule(pathname, visibleSpaces);

  if (!activeSpace) {
    return null;
  }

  return (
    <nav className="internal-breadcrumbs" aria-label="Fil d'ariane">
      <Link href={activeSpace.defaultHref} className="internal-breadcrumb-link">
        {activeSpace.label}
      </Link>
      {activeModule ? <span className="internal-breadcrumb-sep">/</span> : null}
      {activeModule ? <span className="internal-breadcrumb-current">{activeModule.label}</span> : null}
    </nav>
  );
}
