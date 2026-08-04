import Image from "next/image";
import Link from "next/link";
import { MarketingHeader } from "@/components/navigation/marketing-header";
import { ArrowRight, BriefcaseBusiness, Shield, Stethoscope, Wallet } from "lucide-react";

const insuranceLines = [
  {
    title: "Santé",
    text: "Formules Access, Pro et Elite avec prise en charge progressive selon profil et niveau de risque.",
    Icon: Stethoscope,
  },
  {
    title: "Professionnel",
    text: "Protection responsabilité civile, locaux, pertes d'exploitation et accompagnement de crise.",
    Icon: BriefcaseBusiness,
  },
  {
    title: "Patrimoine & vols",
    text: "Garanties contre vols, cambriolages et atteintes aux actifs privés ou commerciaux.",
    Icon: Shield,
  },
];

const formulas = [
  { name: "Access", premium: "400 $ / sem.", coverage: "Essentiels santé et urgences de première ligne." },
  { name: "Pro", premium: "750 $ / sem.", coverage: "Couverture étendue avec remboursements renforcés." },
  { name: "Elite", premium: "1 400 $ / sem.", coverage: "Protection premium sur les cas lourds et sensibles." },
];

export default function AssurancesPage() {
  return (
    <div className="brand-shell brand-lattice flex flex-1 flex-col">
      <MarketingHeader activeTab="ASSURANCES" title="Mercer & Stellaria Insurance" subtitle="Assurances" />

      <main className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 pb-14 pt-6 lg:px-8">
        <section className="marketing-hero-panel insurance-hero-panel surface-navy gold-ring relative overflow-hidden">
          <Image
            src="/holding-abstract-scene.svg"
            alt="Fond assurances Mercer & Stellaria"
            fill
            className="object-cover opacity-54"
          />
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-ms-gold/20 blur-3xl" />
          <div className="relative grid gap-6 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div className="self-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-ms-gold/40 bg-ms-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ms-gold">
                <Wallet size={13} /> Solutions assurantielles
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.04] text-ms-cream md:text-5xl">
                Des offres d'assurance claires, modulaires et suivies en temps réel.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-ms-cream/85 md:text-lg">
                Mercer & Stellaria Insurance couvre les besoins santé, professionnels et patrimoniaux avec un parcours digital de la souscription à l'indemnisation.
              </p>
              <Link
                href="/inscription"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#d8ba7b]"
              >
                Démarrer une souscription <ArrowRight size={16} />
              </Link>
            </div>

            <aside className="max-w-[33rem] justify-self-end rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <Image
                src="/Mercer_Stellaria_CORPORATION.png"
                alt="Mercer & Stellaria Insurance"
                width={640}
                height={360}
                className="h-auto w-full rounded-2xl bg-white/80 p-3 object-contain"
              />
              <p className="mt-4 text-sm leading-6 text-ms-cream/90">
                Couvertures sante, protection professionnelle et suivi d'indemnisation dans un parcours unifie.
              </p>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {insuranceLines.map(({ title, text, Icon }) => (
            <article key={title} className="surface p-6">
              <Icon className="text-ms-navy" />
              <h2 className="mt-4 font-display text-3xl text-ms-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ms-ink/80">{text}</p>
            </article>
          ))}
        </section>

        <section className="surface p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Formules principales</p>
          <h2 className="mt-2 font-display text-4xl text-ms-navy">Comparatif express</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {formulas.map((formula) => (
              <article key={formula.name} className="rounded-2xl border border-ms-navy/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">{formula.name}</p>
                <p className="mt-2 font-display text-3xl text-ms-navy">{formula.premium}</p>
                <p className="mt-3 text-sm leading-6 text-ms-ink/85">{formula.coverage}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
