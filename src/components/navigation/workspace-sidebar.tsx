"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

type WorkspaceSidebarProps = {
  space: "admin" | "collaborateur";
  currentPath: string;
};

type SidebarItem = {
  label: string;
  href: string;
  icon: "dashboard" | "settings" | "users" | "billing" | "cases" | "messages" | "folder";
  permission?: string;
};

function resolveModuleIcon(moduleKey: string): SidebarItem["icon"] {
  if (moduleKey.includes("billing")) {
    return "billing";
  }
  if (moduleKey.includes("case") || moduleKey.includes("law_firm")) {
    return "cases";
  }
  if (moduleKey.includes("search") || moduleKey.includes("message")) {
    return "messages";
  }
  if (moduleKey.includes("users") || moduleKey.includes("team")) {
    return "users";
  }
  return "folder";
}

function hasPermission(permissions: string[] | undefined, key: string) {
  if (!permissions || permissions.length === 0) {
    return false;
  }
  return permissions.includes("*") || permissions.includes(key);
}

function humanizeModule(key: string) {
  return key
    .replace(/^module:/, "")
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function moduleToPath(space: "admin" | "collaborateur", moduleKey: string) {
  const normalized = moduleKey.replace(/^module:/, "");
  if (normalized.startsWith("settings.")) {
    return "/admin/parametres";
  }
  if (normalized.startsWith("law_firm.")) {
    return "/cabinet/espace";
  }
  return space === "admin" ? "/admin" : "/collaborateur";
}

function Icon({ kind }: { kind: SidebarItem["icon"] }) {
  const map: Record<SidebarItem["icon"], string> = {
    dashboard: "M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z",
    settings: "M19.14 12.94a7.5 7.5 0 000-1.88l2.03-1.58-1.92-3.32-2.42.98a7.47 7.47 0 00-1.62-.94l-.36-2.57h-3.84l-.36 2.57c-.57.2-1.11.52-1.62.94l-2.42-.98-1.92 3.32 2.03 1.58a7.5 7.5 0 000 1.88L2.66 14.5l1.92 3.32 2.42-.98c.51.42 1.05.74 1.62.94l.36 2.57h3.84l.36-2.57c.57-.2 1.11-.52 1.62-.94l2.42.98 1.92-3.32-2.03-1.56zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z",
    users: "M16 11a4 4 0 10-4-4 4 4 0 004 4zM8 11a3 3 0 10-3-3 3 3 0 003 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.17.58-2.21 1.56-3C10.75 13.39 9.36 13 8 13zm8 0c-1.8 0-5.4.9-5.4 2.7V19H22v-3.3c0-1.8-3.6-2.7-6-2.7z",
    billing: "M5 3h14a1 1 0 011 1v16l-3-2-3 2-3-2-3 2-3-2-3 2V4a1 1 0 011-1zm3 5v2h8V8H8zm0 4v2h8v-2H8z",
    cases: "M10 4l2 2h8a1 1 0 011 1v11a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h5z",
    messages: "M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2zm2 4v2h12V8H6zm0 4v2h9v-2H6z",
    folder: "M10 4l2 2h8a1 1 0 011 1v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h5z",
  };

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d={map[kind]} />
    </svg>
  );
}

export function WorkspaceSidebar({ space, currentPath }: WorkspaceSidebarProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const permissions = session?.user?.permissions;

  const baseItems = useMemo<SidebarItem[]>(
    () =>
      space === "admin"
        ? [
            { label: "Dashboard", href: "/admin", icon: "dashboard", permission: "space:direction" },
            { label: "Paramètres", href: "/admin/parametres", icon: "settings", permission: "page:admin.settings" },
            { label: "Espace Avocat", href: "/cabinet/espace", icon: "cases", permission: "space:law_firm" },
          ]
        : [
            { label: "Portefeuille", href: "/collaborateur", icon: "users", permission: "space:collaborateur" },
            { label: "Espace Avocat", href: "/cabinet/espace", icon: "cases", permission: "space:law_firm" },
            { label: "Espace Client", href: "/client", icon: "folder", permission: "space:client" },
          ],
    [space],
  );

  const dynamicModuleItems = useMemo(() => {
    const moduleKeys = (permissions ?? []).filter((entry) => entry.startsWith("module:"));
    const known = new Set(baseItems.map((item) => item.permission).filter(Boolean) as string[]);

    return moduleKeys
      .filter((moduleKey) => !known.has(moduleKey))
      .map<SidebarItem>((moduleKey) => ({
        label: humanizeModule(moduleKey),
        href: moduleToPath(space, moduleKey),
        icon: resolveModuleIcon(moduleKey),
        permission: moduleKey,
      }))
      .filter((item, index, array) => array.findIndex((candidate) => candidate.label === item.label && candidate.href === item.href) === index);
  }, [baseItems, permissions, space]);

  const visibleItems = [...baseItems, ...dynamicModuleItems].filter((item) => !item.permission || hasPermission(permissions, item.permission));

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-[95] rounded-full border border-ms-navy/20 bg-white px-4 py-2 text-sm font-semibold text-ms-navy shadow lg:hidden"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Fermer" : "Menu"}
      </button>

      {open ? <button type="button" className="fixed inset-0 z-[90] bg-ms-navy/25 lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu" /> : null}

      <aside
        className={`fixed left-0 top-0 z-[92] h-screen w-[18rem] border-r border-ms-navy/10 bg-white/95 p-4 shadow-xl backdrop-blur transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ms-navy-soft">Navigation</p>
          <p className="mt-1 text-sm font-semibold text-ms-navy">{space === "admin" ? "Espace Direction" : "Espace Collaborateur"}</p>
        </div>

        <nav className="mt-4 space-y-1" aria-label="Navigation latérale">
          {visibleItems.map((item) => {
            const active = currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href));
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-ms-navy text-white shadow"
                    : "border border-transparent text-ms-navy hover:border-ms-navy/15 hover:bg-ms-cream/60"
                }`}
              >
                <Icon kind={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
