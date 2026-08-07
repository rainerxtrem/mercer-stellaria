"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole } from "@/lib/rbac";
import { ChevronDown, Scale, ShieldCheck } from "lucide-react";

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
          <div className="row-start-3 flex w-full flex-col items-stretch justify-center gap-2 lg:row-start-auto lg:w-auto lg:flex-row lg:items-center lg:justify-self-end">
            <div className="group relative hidden lg:block">
              <button
                type="button"
                className="marketing-header-action group inline-flex min-w-[245px] items-center justify-between gap-3"
                aria-haspopup="menu"
              >
                <span className="text-left text-[13px] font-semibold leading-tight">
                  Accès Client & Assuré
                </span>
                <ChevronDown size={16} className="text-ms-navy/75 transition group-hover:rotate-180 group-focus-visible:rotate-180" />
              </button>
              <div className="pointer-events-none invisible absolute right-0 top-[calc(100%+12px)] z-40 w-[370px] translate-y-1 rounded-3xl border border-ms-navy/12 bg-white/95 p-3 opacity-0 shadow-[0_20px_38px_rgba(15,32,67,0.18)] transition duration-200 ease-out backdrop-blur group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ms-navy-soft">
                  Choisissez votre espace de connexion
                </p>
                <Link
                  href="/connexion?space=assure"
                  className="flex items-start gap-3 rounded-2xl border border-ms-navy/10 bg-ms-mist/70 px-3 py-3 transition hover:border-ms-sky/70 hover:bg-ms-mist"
                >
                  <ShieldCheck size={16} className="mt-0.5 text-ms-navy" />
                  <span>
                    <span className="block text-sm font-semibold text-ms-navy">Espace Assuré (Contrats & Attestations)</span>
                    <span className="block text-xs text-ms-ink/70">Suivi des contrats, attestations et sinistres.</span>
                  </span>
                </Link>
                <Link
                  href="/connexion?space=cabinet"
                  className="mt-2 flex items-start gap-3 rounded-2xl border border-ms-navy/10 bg-white px-3 py-3 transition hover:border-ms-gold/70 hover:bg-[#fdf8ef]"
                >
                  <Scale size={16} className="mt-0.5 text-ms-navy" />
                  <span>
                    <span className="block text-sm font-semibold text-ms-navy">Espace Client Cabinet</span>
                    <span className="block text-xs text-ms-ink/70">Accès dossier juridique et accompagnement conseil.</span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="grid w-full gap-2 lg:hidden">
              <Link href="/connexion?space=assure" className="marketing-header-action">
                Espace Assuré (Contrats & Attestations)
              </Link>
              <Link href="/connexion?space=cabinet" className="marketing-header-action">
                Espace Client Cabinet
              </Link>
            </div>

            <Link href="/inscription" className="marketing-header-action marketing-header-action-primary lg:min-h-[2.75rem]">Créer un compte</Link>
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