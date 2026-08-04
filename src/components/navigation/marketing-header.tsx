"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole } from "@/lib/rbac";

type MarketingHeaderTab = "HOME" | "CABINET" | "ASSURANCES";

type MarketingHeaderProps = {
  activeTab: MarketingHeaderTab;
  title: string;
  subtitle: string;
};

export function MarketingHeader({ activeTab, title, subtitle }: MarketingHeaderProps) {
  const { data: session } = useSession();
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const roleTarget = getDefaultSpaceForRole(role);
  const requiresOnboarding = role === "CLIENT" && !session?.user?.profileCompleted;

  return (
    <header className="sticky top-0 z-30 border-b border-ms-navy/10 bg-white/80 backdrop-blur">
      <div className="mx-auto grid w-full max-w-[1500px] items-center gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
        <div className="flex items-center gap-3 lg:justify-self-start">
          <Image
            src="/Mercer_Stellaria_LOGOBLEU.png"
            alt="Mercer & Stellaria Corporation"
            width={92}
            height={92}
            className="h-14 w-auto"
            priority
          />
          <div>
            <p className="agency-name text-2xl font-semibold tracking-wide text-ms-navy">{title}</p>
            <p className="text-[11px] uppercase tracking-[0.28em] text-ms-navy-soft">{subtitle}</p>
          </div>
        </div>

        <nav className="surface tab-strip row-start-2 justify-center p-2 lg:row-start-auto lg:justify-self-center" aria-label="Navigation principale">
          <Link href="/" className={`tab-pill ${activeTab === "HOME" ? "tab-pill-active" : ""}`}>Accueil</Link>
          <Link href="/cabinet" className={`tab-pill ${activeTab === "CABINET" ? "tab-pill-active" : ""}`}>Avocats</Link>
          <Link href="/assurances" className={`tab-pill ${activeTab === "ASSURANCES" ? "tab-pill-active" : ""}`}>Assurances</Link>
        </nav>

        {!session?.user ? (
          <div className="row-start-3 flex items-center justify-center gap-2 lg:row-start-auto lg:justify-self-end">
            <Link href="/connexion" className="marketing-header-action">Connexion</Link>
            <Link href="/inscription" className="marketing-header-action marketing-header-action-primary">Créer un compte</Link>
          </div>
        ) : (
          <div className="row-start-3 flex items-center justify-center gap-2 lg:row-start-auto lg:justify-self-end">
            <Link href={requiresOnboarding ? "/inscription/profil" : roleTarget} className="marketing-header-action marketing-header-action-primary">
              Mon espace
            </Link>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="marketing-header-action">
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}