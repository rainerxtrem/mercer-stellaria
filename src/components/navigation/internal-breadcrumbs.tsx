"use client";

import { getActiveModule, getActiveSpace, resolveAccessibleSpaces } from "@/lib/internal-navigation";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function InternalBreadcrumbs() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const visibleSpaces = resolveAccessibleSpaces({
    permissions: session?.user?.permissions,
    role: session?.user?.role,
    pathname,
  });
  const activeSpace = getActiveSpace(pathname, visibleSpaces);
  const activeModule = getActiveModule(pathname, visibleSpaces);

  if (!activeSpace) {
    return null;
  }

  return (
    <nav className="internal-breadcrumbs" aria-label="Fil d'ariane">
      <div className="flex items-center gap-2">
        <Link href={activeSpace.defaultHref} className="internal-breadcrumb-link">
          {activeSpace.label}
        </Link>
        {activeModule ? <span className="internal-breadcrumb-sep">/</span> : null}
        {activeModule ? <span className="internal-breadcrumb-current">{activeModule.label}</span> : null}
      </div>
      <ThemeToggle />
    </nav>
  );
}
