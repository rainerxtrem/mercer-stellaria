import Image from "next/image";
import Link from "next/link";
import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";
import { ArrowRight, BriefcaseBusiness, Landmark, ShieldCheck, Wallet } from "lucide-react";

const investmentOffers = [
  {
    title: "Capital-investissement",
    text: "Sélection d'opérations ciblées, structuration des tickets et suivi de création de valeur sur des cycles long terme.",
    Icon: BriefcaseBusiness,
  },
  {
    title: "Private Equity",
    text: "Allocation sur stratégies sectorielles, due diligence approfondie et pilotage actif des positions.",
    Icon: Landmark,
  },
  {
    title: "Gestion sous mandat",
    text: "Mandats patrimoniaux personnalisés avec contrôle du risque, reporting transparent et arbitrages cadrés.",
    Icon: Wallet,
  },
];

export default function InvestmentPage() {
  return (
    <div className="brand-shell flex flex-1 flex-col">
      <MarketingHeader />

      <main className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 pb-14 pt-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-[#8fb89c]/45 bg-gradient-to-r from-[#0f2043] via-[#1b376a] to-[#10284f] text-ms-cream shadow-[0_26px_70px_rgba(15,32,67,0.24)]">
          <Image
            src="/holding-abstract-scene.svg"
            alt="Fond investment Mercer & Stellaria"
            fill
            className="object-cover opacity-55"
          />
          <div className="relative grid gap-6 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#8fb89c]/70 bg-[#8fb89c]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#d9f3e2]">
                Private Equity & Wealth Management
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.02] md:text-6xl">
                Mercer & Stellaria Investment — Stratégies de Capital-Investissement & Gestion Patrimoniale
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ms-cream/90 md:text-lg">
                Accompagnement sur-mesure pour dirigeants, family offices et investisseurs institutionnels. Performance,
                rigueur réglementaire et synergie de groupe.
              </p>
              <Link
                href="/connexion?service=investment"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8fb89c] px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#7aa78a]"
              >
                Accéder à l&apos;Espace Investisseur <ArrowRight size={16} />
              </Link>
            </div>

            <aside className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <Image
                src="/Mercer_Stellaria_CORPORATION.png"
                alt="Mercer & Stellaria Investment"
                width={640}
                height={360}
                className="h-auto w-full rounded-2xl bg-white/80 p-3 object-contain"
              />
              <p className="mt-4 text-sm leading-6 text-ms-cream/90">
                Une approche institutionnelle, des allocations lisibles et un dialogue continu avec nos investisseurs.
              </p>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-ms-navy/10 bg-white p-5 md:grid-cols-3 lg:p-6">
          <article className="rounded-2xl border border-ms-navy/10 bg-ms-mist/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Total Encours & Allocations Pilotées</p>
            <p className="mt-2 font-display text-3xl text-ms-navy">+5M$ sous mandat</p>
          </article>
          <article className="rounded-2xl border border-ms-navy/10 bg-ms-mist/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Stratégies de Rendement</p>
            <p className="mt-2 font-display text-3xl text-ms-navy">Private Equity, Real Estate & Private Debt</p>
          </article>
          <article className="rounded-2xl border border-ms-navy/10 bg-ms-mist/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Accompagnement</p>
            <p className="mt-2 font-display text-3xl text-ms-navy">Conseillers dédiés & Reporting temps réel</p>
          </article>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {investmentOffers.map(({ title, text, Icon }) => (
            <article key={title} className="surface p-6">
              <Icon className="text-ms-navy" />
              <h2 className="mt-4 font-display text-3xl text-ms-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ms-ink/80">{text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-ms-navy/15 bg-gradient-to-br from-[#f1f6ff] via-white to-[#edf2fa] p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Synergie de groupe</p>
          <h2 className="mt-2 font-display text-4xl text-ms-navy">Un écosystème à 360° : Juridique, Assurantiel et Financier.</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-ms-ink/80 md:text-base">
            Mercer & Stellaria Investment s&apos;appuie sur le pôle Law Office pour la structuration juridique et fiscale,
            et sur le pôle Insurance pour la protection des actifs et de la continuité patrimoniale.
            Une même direction orchestre les trois expertises pour une trajectoire claire.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-ms-navy/10 bg-white p-4">
              <Landmark className="text-ms-navy" size={18} />
              <p className="mt-2 text-sm font-semibold text-ms-navy">Law Office</p>
              <p className="mt-1 text-xs text-ms-ink/75">Conseil juridique, fiscalité et gouvernance des structures.</p>
            </article>
            <article className="rounded-2xl border border-ms-navy/10 bg-white p-4">
              <ShieldCheck className="text-ms-navy" size={18} />
              <p className="mt-2 text-sm font-semibold text-ms-navy">Insurance</p>
              <p className="mt-1 text-xs text-ms-ink/75">Protection des patrimoines, des personnes et des flux critiques.</p>
            </article>
            <article className="rounded-2xl border border-ms-navy/10 bg-white p-4">
              <Wallet className="text-ms-navy" size={18} />
              <p className="mt-2 text-sm font-semibold text-ms-navy">Investment</p>
              <p className="mt-1 text-xs text-ms-ink/75">Valorisation du capital via allocations sur-mesure et pilotées.</p>
            </article>
          </div>
        </section>

        <section className="rounded-3xl border border-ms-gold/35 bg-ms-navy p-6 text-ms-cream lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-gold">Déjà investisseur ou partenaire ?</p>
          <h2 className="mt-2 font-display text-4xl text-ms-cream">Accédez immédiatement à votre espace sécurisé.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ms-cream/85 md:text-base">
            Reporting, documents contractuels et échanges conseiller centralisés dans votre dashboard opérationnel.
          </p>
          <Link
            href="/connexion?service=investment"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#d8ba7b]"
          >
            Se connecter à mon espace <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
