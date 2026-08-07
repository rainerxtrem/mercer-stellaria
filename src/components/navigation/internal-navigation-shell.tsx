"use client";

import { isInternalPath } from "@/lib/internal-navigation";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { InternalSidebar } from "./internal-sidebar";

type InternalNavigationShellProps = {
  children: ReactNode;
};

export function InternalNavigationShell({ children }: InternalNavigationShellProps) {
  const pathname = usePathname();
  const internal = isInternalPath(pathname);

  if (!internal) {
    return <>{children}</>;
  }

  return (
    <div className="internal-shell">
      <Suspense fallback={null}>
        <InternalSidebar />
      </Suspense>
      <div className="internal-shell-content">{children}</div>
    </div>
  );
}
