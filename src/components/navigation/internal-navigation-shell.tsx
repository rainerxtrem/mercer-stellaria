"use client";

import { isInternalPath } from "@/lib/internal-navigation";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { InternalBreadcrumbs } from "./internal-breadcrumbs";
import { InternalSidebar } from "./internal-sidebar";

type InternalNavigationShellProps = {
  children: ReactNode;
};

export function InternalNavigationShell({ children }: InternalNavigationShellProps) {
  const pathname = usePathname();
  const { status } = useSession();
  const internal = isInternalPath(pathname);

  if (!internal) {
    return <>{children}</>;
  }

  if (status !== "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="internal-shell">
      <Suspense fallback={null}>
        <InternalSidebar />
      </Suspense>
      <div className="internal-shell-content">
        <Suspense fallback={null}>
          <InternalBreadcrumbs />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
