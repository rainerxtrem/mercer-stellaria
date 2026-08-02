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
    <div className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className="rounded-full border border-ms-navy/20 px-3 py-1.5 text-xs font-semibold text-ms-navy"
        >
          Accueil
        </Link>
        {spaces.map((space) => {
          const isCurrent = currentPath === space.href;
          return (
            <Link
              key={space.href}
              href={space.href}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isCurrent ? "bg-ms-navy text-white" : "border border-ms-navy/20 text-ms-navy"
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
        className="rounded-full border border-ms-navy/20 px-3 py-1.5 text-xs font-semibold text-ms-navy"
      >
        Se deconnecter
      </button>
    </div>
  );
}
