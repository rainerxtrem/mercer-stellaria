import Image from "next/image";
import Link from "next/link";
import { MarketingHeader } from "@/components/navigation/marketing-header";
import { ArrowRight, FileText, Landmark, Scale } from "lucide-react";

const offers = [
  {
    title: "Conseil corporate",
    text: "Structuration sociétaire, pactes d'associés, conformité et gouvernance des organes dirigeants.",
    Icon: Landmark,
  },
  {
    title: "Contentieux stratégique",
    text: "Défense civile et commerciale, préparation dossier, gestion du risque judiciaire et négociation.",
    Icon: Scale,
  },
  {
    title: "Ingénierie contractuelle",
    text: "Redaction de contrats sensibles, clauses de protection et dispositifs de securisation des engagements.",
    Icon: FileText,
  },
];

export default function CabinetPage() {
  return (
    <div className="brand-shell brand-lattice flex flex-1 flex-col">
      <MarketingHeader activeTab="CABINET" title="Mercer & Stellaria Law Office" subtitle="Le cabinet" />

      <main className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 pb-14 pt-6 lg:px-8">
        <section className="marketing-hero-panel legal-hero-panel surface-navy gold-ring relative overflow-hidden">
          <Image
            src="/holding-abstract-scene.svg"
            alt="Fond cabinet Mercer & Stellaria"
            fill
            className="object-cover opacity-54"
          />
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-ms-gold/20 blur-3xl" />
          <div className="relative grid items-start gap-6 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-ms-gold/40 bg-ms-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ms-gold">
                <Scale size={13} /> Practice & Counsel
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.04] text-ms-cream md:text-5xl">
                Le conseil juridique de référence du groupe Mercer & Stellaria Corporation.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-ms-cream/85 md:text-lg">
                Le cabinet accompagne dirigeants, entreprises et particuliers sur les enjeux contractuels, contentieux et de gouvernance.
                Notre approche combine rigueur légale et vision business.
              </p>
              <Link
                href="/connexion"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#d8ba7b]"
              >
                Demander un accompagnement <ArrowRight size={16} />
              </Link>
            </div>

            <aside className="max-w-[33rem] justify-self-end rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <Image
                src="/Mercer_Stellaria_CORPORATION.png"
                alt="Mercer & Stellaria Law Office"
                width={640}
                height={360}
                className="h-auto w-full rounded-2xl bg-white/80 p-3 object-contain"
              />
              <p className="mt-4 text-sm leading-6 text-ms-cream/90">
                Conseil stratégique, contentieux et architecture contractuelle pour dirigeants, entreprises et particuliers.
              </p>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {offers.map(({ title, text, Icon }) => (
            <article key={title} className="surface p-6">
              <Icon className="text-ms-navy" />
              <h2 className="mt-4 font-display text-3xl text-ms-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ms-ink/80">{text}</p>
            </article>
          ))}
        </section>

        <section className="surface p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Méthodologie</p>
          <h2 className="mt-2 font-display text-4xl text-ms-navy">Une exécution en 4 étapes</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">1. Cadrage du risque et des enjeux prioritaires.</div>
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">2. Stratégie légale et options de défense ou de négociation.</div>
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">3. Production contractuelle ou contentieuse avec validation client.</div>
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">4. Suivi de l'exécution et pilotage post-décision.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
