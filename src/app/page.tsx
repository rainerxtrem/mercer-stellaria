"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole } from "@/lib/rbac";
import { ArrowRight, Landmark, ShieldCheck, Sparkles } from "lucide-react";

const entities = [
  {
    badge: "Le cabinet",
    title: "Mercer & Stellaria Law Office",
    text: "Conseil, contentieux strategique, gouvernance et mediation pour dirigeants, entreprises et particuliers.",
    href: "/cabinet",
    icon: Landmark,
  },
  {
    badge: "Assurances",
    title: "Mercer & Stellaria Insurance",
    text: "Offres sante, pro et patrimoniales avec souscription, suivi des dossiers et indemnisation pilotees en ligne.",
    href: "/assurances",
    icon: ShieldCheck,
  },
];

export default function Home() {
  const { data: session } = useSession();
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const roleTarget = getDefaultSpaceForRole(role);

  return (
    <div className="brand-shell flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-ms-navy/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/Mercer_Stellaria_LOGOBLEU.png"
              alt="Mercer & Stellaria Corporation"
              width={92}
              height={92}
              className="h-14 w-auto"
              priority
            />
            <div>
              <p className="agency-name text-2xl font-semibold tracking-wide text-ms-navy">Mercer & Stellaria Corporation</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-ms-navy-soft">Holding | Law Office | Insurance</p>
            </div>
          </div>

          <nav className="surface tab-strip p-2" aria-label="Navigation principale">
            <Link href="/cabinet" className="tab-pill">Avocats</Link>
            <Link href="/assurances" className="tab-pill">Assurances</Link>
          </nav>

          {!session?.user ? (
            <div className="flex items-center gap-2">
              <Link href="/connexion" className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy">Connexion</Link>
              <Link href="/inscription" className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">Creer un compte</Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={session.user.profileCompleted ? roleTarget : "/inscription/profil"} className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">
                Mon espace
              </Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy">
                Deconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-14 pt-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-ms-gold/30 bg-ms-navy text-ms-cream shadow-[0_26px_70px_rgba(15,32,67,0.24)]">
          <Image
            src="/holding-abstract-scene.svg"
            alt="Ambiance corporate Mercer & Stellaria"
            fill
            className="object-cover opacity-70"
          />
          <div className="relative grid gap-6 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-ms-gold/50 bg-ms-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ms-gold">
                <Sparkles size={13} /> Vision de groupe
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.02] md:text-6xl">
                La base du groupe: une holding qui orchestre le droit et l&apos;assurance.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ms-cream/90 md:text-lg">
                Mercer & Stellaria Corporation pilote le Mercer & Stellaria Law Office et Mercer & Stellaria Insurance.
                Une direction commune, une execution specialisee, une experience client unifiee.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/cabinet" className="inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy hover:bg-[#d8ba7b]">
                  Le cabinet <ArrowRight size={16} />
                </Link>
                <Link href="/assurances" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20">
                  Assurances <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <Image
                src="/Mercer_Stellaria_LOGOBLEU.png"
                alt="Logo Mercer & Stellaria Corporation"
                width={640}
                height={360}
                className="h-auto w-full rounded-2xl bg-white/80 p-3"
              />
              <p className="mt-4 text-sm leading-6 text-ms-cream/90">
                Holding de pilotage, standards de qualite transverses et synergie operationnelle entre conseil juridique et couverture assurantielle.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {entities.map((entity) => {
            const Icon = entity.icon;
            return (
              <article key={entity.title} className="group relative overflow-hidden rounded-3xl border border-ms-navy/10 bg-white p-6 shadow-[0_18px_45px_rgba(15,32,67,0.08)]">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-ms-sky/20 blur-2xl transition group-hover:scale-110" />
                <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">{entity.badge}</p>
                <div className="relative mt-3 flex items-center gap-3">
                  <div className="rounded-full border border-ms-navy/20 bg-ms-navy/5 p-2">
                    <Icon className="text-ms-navy" size={20} />
                  </div>
                  <h2 className="font-display text-4xl text-ms-navy">{entity.title}</h2>
                </div>
                <p className="relative mt-3 text-sm leading-7 text-ms-ink/85">{entity.text}</p>
                <Link href={entity.href} className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ms-navy-soft">
                  Voir les offres <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-ms-navy/15 bg-[#f2f6fc] p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-ms-navy/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Gouvernance</p>
              <h3 className="mt-2 font-display text-3xl text-ms-navy">Cap strategique</h3>
              <p className="mt-2 text-sm text-ms-ink/80">Comite de direction holding, arbitrage transverse et feuille de route annuelle du groupe.</p>
            </article>
            <article className="rounded-2xl border border-ms-navy/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Execution</p>
              <h3 className="mt-2 font-display text-3xl text-ms-navy">Deux expertises</h3>
              <p className="mt-2 text-sm text-ms-ink/80">Le cabinet traite les enjeux juridiques; les assurances pilotent la protection des clients et entreprises.</p>
            </article>
            <article className="rounded-2xl border border-ms-navy/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Experience</p>
              <h3 className="mt-2 font-display text-3xl text-ms-navy">Un parcours unique</h3>
              <p className="mt-2 text-sm text-ms-ink/80">Des points d'entree clairs par onglet, avec une narration de marque plus forte et coherent sur desktop et mobile.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
