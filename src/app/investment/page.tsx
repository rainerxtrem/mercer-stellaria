import Image from "next/image";
import Link from "next/link";
import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";
import { ArrowRight, BriefcaseBusiness, Landmark, Wallet } from "lucide-react";

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
    <div className="brand-shell brand-lattice flex flex-1 flex-col">
      <MarketingHeader
        activeTab="INVESTMENT"
        title="Mercer & Stellaria Investment"
        subtitle="Holding | Law Office | Insurance | Investment"
      />

      <main className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 pb-14 pt-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-[#8fb89c]/45 bg-ms-navy text-ms-cream shadow-[0_26px_70px_rgba(15,32,67,0.24)]">
          <Image
            src="/holding-abstract-scene.svg"
            alt="Fond investment Mercer & Stellaria"
            fill
            className="object-cover opacity-70"
          />
          <div className="relative grid gap-6 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#8fb89c]/60 bg-[#8fb89c]/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#d5f0dd]">
                Investment Division
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.02] md:text-6xl">
                Mercer & Stellaria Investment - Stratégies d'investissement & Gestion de patrimoine.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ms-cream/90 md:text-lg">
                Nous accompagnons clients privés et institutionnels dans la construction d'allocations robustes, diversifiées et orientées performance durable.
              </p>
              <Link
                href="/connexion?service=investment"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8fb89c] px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#7aa78a]"
              >
                Contacter un conseiller investissement <ArrowRight size={16} />
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

        <section className="grid gap-6 md:grid-cols-3">
          {investmentOffers.map(({ title, text, Icon }) => (
            <article key={title} className="surface p-6">
              <Icon className="text-ms-navy" />
              <h2 className="mt-4 font-display text-3xl text-ms-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ms-ink/80">{text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-[#8fb89c]/45 bg-gradient-to-br from-[#f3fbf6] via-white to-[#e9f5ee] p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f6b46]">Accès investisseur</p>
          <h2 className="mt-2 font-display text-4xl text-ms-navy">Déjà investisseur ?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ms-ink/80 md:text-base">
            Accédez à votre espace pour consulter vos positions, vos reportings et les dernières recommandations de gestion.
          </p>
          <Link
            href="/connexion?service=investment"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ms-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-ms-navy-soft"
          >
            Accéder à l'Espace Client Investisseur <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
