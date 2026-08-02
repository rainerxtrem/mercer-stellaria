import Link from "next/link";
import { ArrowRight, BalanceScale, FileText, Landmark, Scale } from "lucide-react";

const offers = [
  {
    title: "Conseil corporate",
    text: "Structuration societaire, pactes d'associes, conformite et gouvernance des organes dirigeants.",
    Icon: Landmark,
  },
  {
    title: "Contentieux strategique",
    text: "Defense civile et commerciale, preparation dossier, gestion du risque judiciaire et negotiation.",
    Icon: Scale,
  },
  {
    title: "Ingenierie contractuelle",
    text: "Redaction de contrats sensibles, clauses de protection et dispositifs de securisation des engagements.",
    Icon: FileText,
  },
];

export default function CabinetPage() {
  return (
    <div className="brand-shell brand-lattice flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
        <div>
          <p className="agency-name text-3xl font-semibold tracking-wide text-ms-navy">Mercer & Stelleria Law Office</p>
          <p className="text-xs uppercase tracking-[0.28em] text-ms-navy-soft">Le cabinet</p>
        </div>
        <nav className="surface tab-strip p-2" aria-label="Navigation">
          <Link href="/" className="tab-pill">Accueil</Link>
          <Link href="/cabinet" className="tab-pill tab-pill-active">Le cabinet</Link>
          <Link href="/assurances" className="tab-pill">Assurances</Link>
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-14 pt-4 lg:px-10">
        <section className="surface-navy gold-ring relative overflow-hidden p-8 lg:p-12">
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-ms-gold/20 blur-3xl" />
          <p className="inline-flex items-center gap-2 rounded-full border border-ms-gold/40 bg-ms-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ms-gold">
            <BalanceScale size={13} /> Practice & Counsel
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.04] text-ms-cream md:text-6xl">
            Le conseil juridique de reference du groupe Mercer & Stelleria Corporation.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ms-cream/85 md:text-lg">
            Le cabinet accompagne dirigeants, entreprises et particuliers sur les enjeux contractuels, contentieux et de gouvernance.
            Notre approche combine rigueur legale et vision business.
          </p>
          <Link
            href="/connexion"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#d8ba7b]"
          >
            Demander un accompagnement <ArrowRight size={16} />
          </Link>
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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Methodologie</p>
          <h2 className="mt-2 font-display text-4xl text-ms-navy">Une execution en 4 etapes</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">1. Cadrage du risque et des enjeux prioritaires.</div>
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">2. Strategie legale et options de defense ou de negociation.</div>
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">3. Production contractuelle ou contentieuse avec validation client.</div>
            <div className="rounded-xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">4. Suivi de l'execution et pilotage post-decision.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
