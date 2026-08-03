"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AppRole, getAccessibleSpaces } from "@/lib/rbac";

type RoleSwitcherProps = {
  currentPath: string;
};

export function RoleSwitcher({ currentPath }: RoleSwitcherProps) {
  const { data: session } = useSession();
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const spaces = getAccessibleSpaces(role);

  return (
    <div className="surface role-switcher reveal-up flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
      <div className="role-switcher-links flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className="role-switcher-link"
        >
          Accueil
        </Link>
        {spaces.map((space) => {
          const isCurrent = currentPath === space.href;
          return (
            <Link
              key={space.href}
              href={space.href}
              className={`role-switcher-link ${
                isCurrent ? "role-switcher-link-active" : ""
              }`}
            >
              {space.label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="role-switcher-logout"
      >
        Se deconnecter
      </button>
    </div>
  );
}
