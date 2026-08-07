"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type ModulePermissionGuardProps = {
  permission: string;
  children: ReactNode;
};

function hasPermission(permissions: string[] | undefined, permissionKey: string) {
  if (!permissions || permissions.length === 0) {
    return false;
  }
  return permissions.includes("*") || permissions.includes(permissionKey);
}

export function ModulePermissionGuard({ permission, children }: ModulePermissionGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion");
    }
  }, [router, status]);

  if (status === "loading") {
    return <main className="workspace-shell mx-auto w-full max-w-[1400px] px-4 py-6"><p className="text-sm text-ms-ink/70">Chargement des permissions...</p></main>;
  }

  const granted = hasPermission(session?.user?.permissions, permission);

  if (!granted) {
    return (
      <main className="workspace-shell mx-auto w-full max-w-[1400px] px-4 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          Accès refusé pour ce module.
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
