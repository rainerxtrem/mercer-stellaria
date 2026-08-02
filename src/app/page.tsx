"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole } from "@/lib/rbac";
import { ArrowRight, Building2, Landmark, ShieldCheck, Sparkles } from "lucide-react";

const holdingPillars = [
  {
    title: "Strategie & gouvernance",
    text: "Mercer & Stelleria Corporation pilote la vision, les standards de qualite et la croissance des entites du groupe.",
    Icon: Building2,
  },
  {
    title: "Cadre legal",
    text: "Le cabinet Mercer & Stellaria Law Office encadre les contrats, la conformite et la defense des interets clients.",
    Icon: Landmark,
  },
  {
    title: "Protection assurantielle",
    text: "Mercer & Stellaria Insurance propose des offres sante, pro et patrimoniales avec suivi numerique complet.",
    Icon: ShieldCheck,
  },
];

const companyHighlights = [
  {
    key: "Le cabinet",
    title: "Mercer & Stellaria Law Office",
    intro: "Conseil, contentieux strategique et gouvernance juridique pour particuliers, dirigeants et entreprises.",
    offers: [
      "Audit contractuel et prevention des risques contentieux.",
      "Defense civile, commerciale et corporate.",
      "Accompagnement de crise et mediation.",
    ],
    href: "/cabinet",
  },
  {
    key: "Assurances",
    title: "Mercer & Stellaria Insurance",
    intro: "Solutions assurelles multi-secteurs avec souscription, gestion des sinistres et indemnisation pilotees en ligne.",
    offers: [
      "Formules Sante Access, Pro et Elite.",
      "Couvertures Professionnel et responsabilite metier.",
      "Garanties Vols, cambriolages et actifs sensibles.",
    ],
    href: "/assurances",
  },
];

export default function Home() {
  const { data: session } = useSession();
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const roleTarget = getDefaultSpaceForRole(role);

  return (
    <div className="brand-shell brand-lattice flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
        <div className="text-ms-navy">
          <p className="agency-name text-3xl font-semibold tracking-wide">Mercer & Stelleria Corporation</p>
          <p className="text-xs uppercase tracking-[0.28em] text-ms-navy-soft">Holding | Law Office | Insurance</p>
        </div>

        <nav className="surface tab-strip p-2" aria-label="Navigation principale">
          <Link href="/cabinet" className="tab-pill">Le cabinet</Link>
          <Link href="/assurances" className="tab-pill">Assurances</Link>
        </nav>

        {!session?.user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/connexion"
              className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy transition hover:border-ms-navy"
            >
              Connexion
            </Link>
            <Link
              href="/inscription"
              className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ms-navy-soft"
            >
              Creer un compte
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={session.user.profileCompleted ? roleTarget : "/inscription/profil"}
              className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ms-navy-soft"
            >
              Mon espace
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy"
            >
              Deconnexion
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-14 pt-4 lg:px-10">
        <section className="surface-navy gold-ring reveal-up relative overflow-hidden p-8 lg:p-12">
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-ms-gold/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-ms-sky/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-ms-gold/40 bg-ms-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ms-gold">
                <Sparkles size={13} /> Groupe Mercer & Stelleria
              </p>
              <h1 className="max-w-3xl font-display text-5xl leading-[1.04] text-ms-cream md:text-6xl">
                La holding qui coordonne droit, assurance et excellence operationnelle.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ms-cream/85 md:text-lg">
                Mercer & Stelleria Corporation structure les activites du Mercer & Stellaria Law Office et de Mercer & Stellaria Insurance.
                Notre premiere mission: offrir un cadre de confiance, des offres lisibles et un service hautement reactif.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/cabinet"
                  className="inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#d8ba7b]"
                >
                  Decouvrir le cabinet <ArrowRight size={16} />
                </Link>
                <Link
                  href="/assurances"
                  className="inline-flex items-center gap-2 rounded-full border border-ms-cream/45 bg-white/10 px-5 py-3 text-sm font-semibold text-ms-cream transition hover:bg-white/20"
                >
                  Explorer les assurances <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-ms-gold/30 bg-white/8 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ms-gold">Positionnement</p>
              <div className="gold-divider my-5" />
              <ul className="space-y-4 text-sm text-ms-cream/90">
                <li>Une gouvernance unique pour deux metiers complementaires.</li>
                <li>Des standards de qualite partages entre legal et assurance.</li>
                <li>Une experience client unifiee, de la prevention a la resolution.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="reveal-up-delay grid gap-6 md:grid-cols-3">
          {holdingPillars.map(({ title, text, Icon }) => (
            <article key={title} className="surface p-6">
              <Icon className="text-ms-navy" />
              <h2 className="mt-4 font-display text-3xl text-ms-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ms-ink/80">{text}</p>
            </article>
          ))}
        </section>

        <section className="surface p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Nos societes operationnelles</p>
              <h2 className="font-display text-4xl text-ms-navy">Le cabinet et les assurances</h2>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Acces aux societes">
              <Link href="/cabinet" className="rounded-full border border-ms-navy/20 bg-white px-4 py-2 text-sm font-semibold text-ms-navy transition hover:border-ms-navy">
                Onglet Le cabinet
              </Link>
              <Link href="/assurances" className="rounded-full border border-ms-navy/20 bg-white px-4 py-2 text-sm font-semibold text-ms-navy transition hover:border-ms-navy">
                Onglet Assurances
              </Link>
            </nav>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {companyHighlights.map((company) => (
              <article key={company.key} className="rounded-2xl border border-ms-navy/10 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">{company.key}</p>
                <h3 className="mt-2 font-display text-4xl text-ms-navy">{company.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ms-ink/85">{company.intro}</p>
                <ul className="mt-5 space-y-3 text-sm text-ms-ink/90">
                  {company.offers.map((offer) => (
                    <li key={offer} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ms-gold" />
                      <span>{offer}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={company.href}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ms-navy-soft"
                >
                  Voir la presentation complete <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
