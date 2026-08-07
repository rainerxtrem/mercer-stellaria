"use client";

import { getActiveSpace, getImplementedModules, resolveAccessibleSpaces, type InternalSpace } from "@/lib/internal-navigation";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type ClientSidebarModuleFlags = {
  hasAccessibleContracts: boolean;
  hasActiveInsuranceContract: boolean;
  hasAccessibleMatters: boolean;
};

type SidebarContractPayload = {
  status?: string;
};

function Icon({ kind }: { kind: InternalSpace["icon"] }) {
  const paths: Record<InternalSpace["icon"], string> = {
    briefcase: "M10 4l2 2h8a1 1 0 011 1v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h5z",
    shield: "M12 2l8 3v6c0 5.2-3.4 9.8-8 11-4.6-1.2-8-5.8-8-11V5l8-3z",
    users: "M16 11a4 4 0 10-4-4 4 4 0 004 4zM8 11a3 3 0 10-3-3 3 3 0 003 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.17.58-2.21 1.56-3C10.75 13.39 9.36 13 8 13zm8 0c-1.8 0-5.4.9-5.4 2.7V19H22v-3.3c0-1.8-3.6-2.7-6-2.7z",
    chart: "M4 19h16v2H2V3h2v16zm2-2V9h3v8H6zm5 0V5h3v12h-3zm5 0v-6h3v6h-3z",
    heart: "M12 21s-7-4.6-9.6-9A5.7 5.7 0 0112 5.3 5.7 5.7 0 0121.6 12C19 16.4 12 21 12 21z",
    home: "M12 3l9 8h-3v10h-5v-6h-2v6H6V11H3l9-8z",
  };

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d={paths[kind]} />
    </svg>
  );
}

function isModuleActive(href: string, pathname: string, queryString: string, hash: string) {
  const url = new URL(href, "https://mercer.local");
  if (url.pathname !== pathname) {
    return false;
  }

  if (url.hash) {
    return url.hash === hash;
  }

  if (url.search) {
    return url.search === queryString;
  }

  return true;
}

export function InternalSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [hash, setHash] = useState("");
  const [clientModuleFlags, setClientModuleFlags] = useState<ClientSidebarModuleFlags>({
    hasAccessibleContracts: false,
    hasActiveInsuranceContract: false,
    hasAccessibleMatters: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname, queryString]);

  const visibleSpaces = useMemo(
    () =>
      resolveAccessibleSpaces({
        permissions: session?.user?.permissions,
        role: session?.user?.role,
        pathname,
      }),
    [pathname, session?.user?.permissions, session?.user?.role],
  );

  const activeSpace = getActiveSpace(pathname, visibleSpaces);

  useEffect(() => {
    let cancelled = false;

    async function loadClientModuleFlags() {
      if (session?.user?.role !== "CLIENT") {
        if (!cancelled) {
          setClientModuleFlags({
            hasAccessibleContracts: true,
            hasActiveInsuranceContract: true,
            hasAccessibleMatters: true,
          });
        }
        return;
      }

      try {
        const [contractsRes, mattersRes] = await Promise.all([
          fetch("/api/contracts?scope=self"),
          fetch("/api/law-firm/matters?scope=self"),
        ]);

        const [contractsJson, mattersJson] = await Promise.all([
          contractsRes.ok ? contractsRes.json() : Promise.resolve({ data: [] }),
          mattersRes.ok ? mattersRes.json() : Promise.resolve({ data: [] }),
        ]);

        const contracts: SidebarContractPayload[] = Array.isArray(contractsJson?.data) ? contractsJson.data : [];
        const matters: Array<Record<string, unknown>> = Array.isArray(mattersJson?.data) ? mattersJson.data : [];
        const hasAccessibleContracts = contracts.some((contract) => contract?.status === "ACTIVE" || contract?.status === "PENDING_SIGNATURE");
        const hasActiveInsuranceContract = contracts.some((contract) => contract?.status === "ACTIVE");
        const hasAccessibleMatters = matters.length > 0;

        if (!cancelled) {
          setClientModuleFlags({ hasAccessibleContracts, hasActiveInsuranceContract, hasAccessibleMatters });
        }
      } catch {
        if (!cancelled) {
          setClientModuleFlags({
            hasAccessibleContracts: false,
            hasActiveInsuranceContract: false,
            hasAccessibleMatters: false,
          });
        }
      }
    }

    void loadClientModuleFlags();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.role]);

  const visibleModulesBySpace = useMemo(() => {
    const map = new Map<InternalSpace["id"], InternalSpace["modules"]>();

    visibleSpaces.forEach((space) => {
      const implementedModules = getImplementedModules(space);

      if (space.id !== "client") {
        map.set(space.id, implementedModules);
        return;
      }

      const filtered = implementedModules.filter((module) => {
        if (module.id === "contracts") {
          return clientModuleFlags.hasAccessibleContracts;
        }

        if (module.id === "claims") {
          return clientModuleFlags.hasActiveInsuranceContract;
        }

        if (module.id === "matters") {
          return clientModuleFlags.hasAccessibleMatters;
        }

        return true;
      });

      map.set(space.id, filtered);
    });

    return map;
  }, [clientModuleFlags, visibleSpaces]);

  const activeModuleId = useMemo(() => {
    if (!activeSpace) {
      return null;
    }

    const activeModules = visibleModulesBySpace.get(activeSpace.id) ?? activeSpace.modules;
    const activeModule = activeModules.find((module) => isModuleActive(module.href, pathname, queryString, hash));
    return activeModule?.id ?? null;
  }, [activeSpace, hash, pathname, queryString, visibleModulesBySpace]);

  if (!activeSpace || visibleSpaces.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="internal-sidebar-hamburger lg:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir la navigation"
      >
        <span />
        <span />
        <span />
      </button>

      {isOpen ? <button type="button" className="internal-sidebar-overlay lg:hidden" onClick={() => setIsOpen(false)} aria-label="Fermer la navigation" /> : null}

      <aside className={`internal-sidebar ${isOpen ? "internal-sidebar-open" : ""}`}>
        <div className="internal-sidebar-head">
          <p className="internal-sidebar-eyebrow">Espaces</p>
          <p className="internal-sidebar-title">Navigation interne</p>
        </div>

        <nav className="internal-sidebar-nav" aria-label="Espaces internes">
          {visibleSpaces.map((space) => {
            const isSpaceActive = activeSpace.id === space.id;
            return (
              <div key={space.id} className="internal-sidebar-space">
                <Link
                  href={space.defaultHref}
                  onClick={() => setIsOpen(false)}
                  className={`internal-sidebar-space-link ${isSpaceActive && !activeModuleId ? "internal-sidebar-space-link-active" : ""}`}
                >
                  <Icon kind={space.icon} />
                  <span>{space.label}</span>
                </Link>

                {isSpaceActive ? (
                  <div className="internal-sidebar-submenu">
                    {(visibleModulesBySpace.get(space.id) ?? space.modules).map((module) => {
                      const active = isModuleActive(module.href, pathname, queryString, hash);
                      return (
                        <Link
                          key={module.id}
                          href={module.href}
                          onClick={() => setIsOpen(false)}
                          className={`internal-sidebar-module-link ${active ? "internal-sidebar-module-link-active" : ""}`}
                        >
                          <span>{module.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <button type="button" className="internal-sidebar-logout" onClick={() => signOut({ callbackUrl: "/" })}>
          Se deconnecter
        </button>
      </aside>
    </>
  );
}
