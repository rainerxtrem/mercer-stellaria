import Image from "next/image";
import Link from "next/link";
import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";
import { ArrowRight, BriefcaseBusiness, Clock3, HeartHandshake, Shield, ShieldCheck, Sparkles, Stethoscope, Wallet } from "lucide-react";

const insuranceLines = [
  {
    title: "Santé",
    text: "Prise en charge progressive, garanties lisibles et montée en gamme simple selon le niveau de protection recherché.",
    Icon: Stethoscope,
  },
  {
    title: "Professionnel",
    text: "Protection responsabilité civile, locaux, pertes d'exploitation et appui en cas d'incident ou de tension d'activité.",
    Icon: BriefcaseBusiness,
  },
  {
    title: "Patrimoine & vols",
    text: "Garanties contre vols, cambriolages et atteintes aux actifs privés ou commerciaux, avec lecture claire des exclusions.",
    Icon: Shield,
  },
];

const formulas = [
  {
    name: "Care Plus",
    premium: "850 $ / sem.",
    coverage: "Hospitalisation, urgences, pharmacie et accompagnement santé de référence.",
    audience: "Pour les clients qui veulent un socle solide, rapide à comprendre et à activer.",
  },
  {
    name: "Safe Home",
    premium: "650 $ / sem.",
    coverage: "Vol, effraction, incendie et protection des biens essentiels.",
    audience: "Pour sécuriser l'habitation ou les actifs personnels avec un contrat lisible.",
  },
  {
    name: "Business Shield",
    premium: "850 $ / sem.",
    coverage: "Responsabilité civile, pertes d'exploitation et continuité d'activité.",
    audience: "Pour les professionnels qui veulent une réponse efficace et une vraie stabilité.",
  },
];


const trustPoints = [
  {
    title: "Réponse rapide",
    text: "Nous traitons les demandes avec un temps de réponse court et un suivi clair à chaque étape.",
    Icon: Clock3,
  },
  {
    title: "Fidélité client",
    text: "Notre priorité est de construire une relation durable, avec des contrats qui suivent les besoins réels.",
    Icon: HeartHandshake,
  },
  {
    title: "Accompagnement complet",
    text: "De la souscription à l'indemnisation, l'équipe reste présente et explicite sur les démarches.",
    Icon: ShieldCheck,
  },
  {
    title: "Conseil humain",
    text: "Un interlocuteur lisible, des explications simples et des propositions qui donnent envie d'avancer.",
    Icon: Sparkles,
  },
];
export default function AssurancesPage() {
  return (
    <div className="brand-shell brand-lattice flex flex-1 flex-col">
      <MarketingHeader />

      <main className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 pb-14 pt-6 lg:px-8">
        <section className="marketing-hero-panel insurance-hero-panel relative overflow-hidden rounded-[30px] border border-ms-gold/30 bg-ms-navy text-ms-cream shadow-[0_26px_70px_rgba(15,32,67,0.24)]">
          <Image
            src="/holding-abstract-scene.svg"
            alt="Fond assurances Mercer & Stellaria"
            fill
            className="object-cover opacity-70"
          />
          <div className="relative grid gap-6 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-ms-gold/40 bg-ms-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ms-gold">
                <Wallet size={13} /> Solutions assurantielles
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.02] md:text-6xl">
                Des offres d'assurance claires, modulaires et suivies en temps réel.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ms-cream/90 md:text-lg">
                Mercer & Stellaria Insurance couvre les besoins santé, professionnels et patrimoniaux avec un parcours digital de la souscription à l'indemnisation.
              </p>
              <Link
                href="/inscription"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#d8ba7b]"
              >
                Démarrer une souscription <ArrowRight size={16} />
              </Link>
            </div>

            <aside className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <Image
                src="/Mercer_Stellaria_CORPORATION.png"
                alt="Mercer & Stellaria Insurance"
                width={640}
                height={360}
                className="h-auto w-full rounded-2xl bg-white/80 p-3 object-contain"
              />
              <p className="mt-4 text-sm leading-6 text-ms-cream/90">
                Compagnie pensée pour la clarté, la proximité et la fidélité client, avec des réponses rapides et un accompagnement continu.
              </p>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {trustPoints.map(({ title, text, Icon }) => (
            <article key={title} className="surface p-6">
              <Icon className="text-ms-navy" />
              <h2 className="mt-4 font-display text-3xl text-ms-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ms-ink/80">{text}</p>
            </article>
          ))}
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
          <p className="mt-3 max-w-4xl text-sm leading-6 text-ms-ink/75 md:text-base">
            Trois offres simples à comparer, avec un positionnement clair sur la couverture, le profil visé et le niveau de sérénité apporté.
          </p>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {formulas.map((formula) => (
              <article key={formula.name} className="rounded-3xl border border-ms-navy/10 bg-white p-5 shadow-[0_16px_34px_rgba(15,32,67,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">{formula.name}</p>
                    <p className="mt-2 font-display text-3xl text-ms-navy">{formula.premium}</p>
                  </div>
                  <span className="rounded-full border border-ms-gold/30 bg-ms-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ms-gold">
                    Express
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-ms-ink/85">{formula.coverage}</p>
                <p className="mt-4 text-sm leading-6 text-ms-ink/75">{formula.audience}</p>
                <div className="mt-5 rounded-2xl bg-ms-cream/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Pourquoi choisir cette formule</p>
                  <p className="mt-2 text-sm leading-6 text-ms-ink/80">
                    Une formule pensée pour simplifier la décision, rassurer le client et accélérer la mise en place du contrat.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
