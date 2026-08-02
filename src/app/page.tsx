"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, ShieldCheck, Stethoscope } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole } from "@/lib/rbac";

type ServiceTab = "sante" | "professionnel" | "vols";

const generalCards = [
  {
    title: "Sante",
    text: "Couvertures medicales Access, Pro et Elite avec remboursement prioritaire et suivi des actes lourds.",
    Icon: Stethoscope,
  },
  {
    title: "Professionnel",
    text: "Protection des entreprises, responsabilite civile et continuites d'activite pour tous les metiers.",
    Icon: BriefcaseBusiness,
  },
  {
    title: "Vols",
    text: "Garanties habitation, vehicules et commerces contre vol, cambriolage et pertes operationnelles.",
    Icon: ShieldCheck,
  },
];

const serviceTabs = {
  sante: {
    title: "Pole Sante",
    subtitle: "Convention Pillbox Medical Center",
    pitch:
      "Prise en charge des urgences, imagerie, chirurgies et traumatologie avec remboursement bancaire rapide apres validation.",
    offers: [
      "ACCESS - 400 $ / sem. : soins legers, ambulance, imagerie a 40%.",
      "PRO - 750 $ / sem. : reanimation 100%, traumatologie 65%, BPB/BPA 50%.",
      "ELITE - 1 400 $ / sem. : urgence 100%, imagerie 100%, chirurgies lourdes 85%.",
    ],
    points: [
      "Declaration des factures sous 48h.",
      "Sinistres chirurgicaux suivis 24/7.",
      "Plafonds hebdomadaires contractuels clairs.",
    ],
  },
  professionnel: {
    title: "Pole Professionnel",
    subtitle: "Protection metier et exploitation",
    pitch:
      "Des contrats modulaires pour proteger la responsabilite du dirigeant, les actifs de l'entreprise et la continuite des operations.",
    offers: [
      "RC Pro : defense et prise en charge des dommages causes aux tiers.",
      "Protection des locaux : incendie, degats, materiel sensible et stock critiques.",
      "Perte d'exploitation : compensation des revenus en cas d'arret temporaire.",
    ],
    points: [
      "Options multi-sites et franchises adaptees.",
      "Gestion prioritaire des dossiers entreprises.",
      "Accompagnement direction et conformite contractuelle.",
    ],
  },
  vols: {
    title: "Pole Vols & Cambriolages",
    subtitle: "Biens prives et professionnels",
    pitch:
      "Couvertures dediees aux risques de vol urbain: habitation, vehicule, commerce et equipements a forte valeur.",
    offers: [
      "Safe Home : protection logement, contenus et effraction.",
      "Auto Secure : vol de vehicule et assistance recuperation.",
      "Commerce Shield : vol en boutique, bris et pertes liees a l'interruption.",
    ],
    points: [
      "Evaluation rapide du sinistre et estimation des pertes.",
      "Workflow de validation numerique avec pieces justificatives.",
      "Suivi temps reel des remboursements dans votre portail.",
    ],
  },
} as const;

const healthComparisonRows = [
  {
    act: "Soin simple / sutures / pansements",
    price: "150 $ - 300 $",
    essential: "100% (Reste 0$)",
    plus: "100% (Reste 0$)",
    max: "100% (Reste 0$)",
  },
  {
    act: "Reanimation d'urgence / choc vagal",
    price: "300 $",
    essential: "100% (Reste 0$)",
    plus: "100% (Reste 0$)",
    max: "100% (Reste 0$)",
  },
  {
    act: "Transport ambulance",
    price: "200 $",
    essential: "100% (Reste 0$)",
    plus: "100% (Reste 0$)",
    max: "100% (Reste 0$)",
  },
  {
    act: "Transport heliporte urgence",
    price: "500 $",
    essential: "40% (Reste 300$)",
    plus: "50% (Reste 250$)",
    max: "100% (Reste 0$)",
  },
  {
    act: "Radiographie / echographie",
    price: "300 $",
    essential: "40% (Reste 180$)",
    plus: "70% (Reste 90$)",
    max: "100% (Reste 0$)",
  },
  {
    act: "IRM / Scanner",
    price: "400 $",
    essential: "40% (Reste 240$)",
    plus: "70% (Reste 120$)",
    max: "100% (Reste 0$)",
  },
  {
    act: "Bilan biologique complet",
    price: "100 $ - 300 $",
    essential: "40%",
    plus: "70%",
    max: "100% (Reste 0$)",
  },
  {
    act: "Chirurgie simple / fracture fermee",
    price: "1 200 $",
    essential: "40% (Reste 720$)",
    plus: "65% (Reste 420$)",
    max: "85% (Reste 180$)",
  },
  {
    act: "Chirurgie traumatologique",
    price: "1 200 $",
    essential: "40% (Reste 720$)",
    plus: "65% (Reste 420$)",
    max: "85% (Reste 180$)",
  },
  {
    act: "Blessure par arme blanche (BPA)",
    price: "1 300 $",
    essential: "Non couvert",
    plus: "50% (Reste 650$)",
    max: "85% (Reste 195$)",
  },
  {
    act: "Blessure par balle (BPB)",
    price: "1 500 $",
    essential: "Non couvert",
    plus: "50% (Reste 750$)",
    max: "85% (Reste 225$)",
  },
  {
    act: "Neurochirurgie / cardio",
    price: "3 000 $",
    essential: "40% (Reste 1 800$)",
    plus: "65% (Reste 1 050$)",
    max: "85% (Reste 450$)",
  },
] as const;

const healthFormulaCards = [
  {
    level: "Niveau I",
    name: "ACCESS / Essential Care",
    premium: "400 $ / sem.",
    bullets: [
      "100% urgences legeres et transports ambulance.",
      "40% imagerie, biologie et chirurgies de routine.",
      "Exclusion blessures par armes.",
    ],
  },
  {
    level: "Niveau II",
    name: "PRO / Care Plus",
    premium: "750 $ / sem.",
    bullets: [
      "100% urgences et reanimation.",
      "70% imagerie et biologie, 65% traumatologie.",
      "50% blessures BPB / BPA.",
    ],
  },
  {
    level: "Niveau III",
    name: "ELITE / Care Max",
    premium: "1 400 $ / sem.",
    bullets: [
      "100% urgences, ambulance, helicoptere et imagerie.",
      "85% chirurgies lourdes et blessures par arme.",
      "Protection renforcee profils a risque.",
    ],
  },
] as const;

const healthExtensions = [
  "Extension Protection Juridique Sante (+150 $/semaine): representation juridique en cas d'erreur medicale.",
  "Extension Addictologie & Rehabilitation (+200 $/semaine): prise en charge 80% des cures et bilans psychiatriques.",
] as const;

const healthGeneralConditions = [
  "Article 1 - Prise d'effet: actif apres premiere cotisation et signature, renouvellement hebdomadaire tacite.",
  "Article 2 - Paiement: echeance chaque dimanche 23h59, suspension immediate en cas de retard.",
  "Article 3 - Remboursement: facture reglee puis transmise sous 48h, validation avant virement bancaire.",
  "Article 4 - Exclusions: chirurgie esthetique non accidentelle, greffes, fraude et fausse declaration.",
  "Article 5 - Plafonds: 3 000 $ (Essential), 7 000 $ (Care Plus), 12 000 $ (Care Max) par semaine.",
] as const;

export default function Home() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ServiceTab>("sante");
  const activeContent = useMemo(() => serviceTabs[activeTab], [activeTab]);
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const roleTarget = getDefaultSpaceForRole(role);

  const identity = useMemo(() => {
    const firstName = session?.user?.firstName?.trim();
    const lastName = session?.user?.lastName?.trim();
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    return session?.user?.name ?? "Assure connecte";
  }, [session?.user?.firstName, session?.user?.lastName, session?.user?.name]);

  return (
    <div className="brand-shell brand-lattice flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="text-ms-navy">
          <p className="agency-name text-2xl font-semibold tracking-wide">Mercer & Stellaria</p>
          <p className="text-xs uppercase tracking-[0.3em] text-ms-navy-soft">Insurance Company</p>
        </div>
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
            <p className="rounded-full border border-ms-gold/45 bg-white/85 px-4 py-2 text-sm font-semibold text-ms-navy">
              {identity}
            </p>
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

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-ms-gold/40 bg-ms-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ms-gold">
                Groupe d&apos;assurance premium - Los Santos
              </p>
              <h1 className="max-w-3xl font-display text-5xl leading-[1.04] text-ms-cream md:text-6xl">
                Protection generale, sante, professionnel et vols dans un seul portail.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ms-cream/85 md:text-lg">
                Mercer & Stellaria centralise la souscription, les sinistres et les remboursements pour les citoyens,
                les entreprises et les activites a risque de San Andreas.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-2 rounded-full bg-ms-gold px-5 py-3 text-sm font-semibold text-ms-navy transition hover:bg-[#d8ba7b]"
                >
                  Acceder au portail securise <ArrowRight size={16} />
                </Link>
                <Link
                  href="/inscription"
                  className="inline-flex items-center gap-2 rounded-full border border-ms-cream/45 bg-white/10 px-5 py-3 text-sm font-semibold text-ms-cream transition hover:bg-white/20"
                >
                  Demarrer une adhesion <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-ms-gold/30 bg-white/8 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ms-gold">Nos engagements</p>
              <div className="gold-divider my-5" />
              <ul className="space-y-4 text-sm text-ms-cream/90">
                <li>Remboursement et indemnisation avec suivi numerique de chaque etape.</li>
                <li>Gestion des sinistres medicals, professionnels et vols dans une meme interface.</li>
                <li>Cadre juridique clair, cotisations transparentes et auditabilite complete.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="reveal-up-delay grid gap-6 md:grid-cols-3">
          {generalCards.map(({ title, text, Icon }) => (
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Nos offres par domaine</p>
              <h2 className="font-display text-4xl text-ms-navy">Sante, Professionnel, Vols</h2>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Offres Mercer & Stellaria">
              {(
                [
                  { key: "sante", label: "Sante" },
                  { key: "professionnel", label: "Professionnel" },
                  { key: "vols", label: "Vols" },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-ms-gold bg-ms-gold text-ms-navy"
                        : "border-ms-navy/20 bg-white text-ms-navy hover:border-ms-navy"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-6 rounded-2xl border border-ms-navy/10 bg-white p-6 lg:grid-cols-[1.15fr_1fr]">
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">{activeContent.subtitle}</p>
              <h3 className="mt-2 font-display text-4xl text-ms-navy">{activeContent.title}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ms-ink/85">{activeContent.pitch}</p>

              <ul className="mt-5 space-y-3 text-sm text-ms-ink/90">
                {activeContent.offers.map((offer) => (
                  <li key={offer} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ms-gold" />
                    <span>{offer}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-ms-gold/30 bg-gradient-to-b from-[#fffaf0] to-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Points forts</p>
              <div className="gold-divider my-4" />
              <ul className="space-y-3 text-sm text-ms-ink/90">
                {activeContent.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block rounded-full bg-ms-navy px-2 py-0.5 text-xs text-white">MS</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="surface p-0 overflow-hidden">
          <div className="border-b border-ms-navy/10 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Offres sante 2026</p>
            <h2 className="mt-1 font-display text-4xl text-ms-navy">Tableau comparatif detaille</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-ms-navy text-ms-cream">
                <tr>
                  <th className="px-4 py-3 font-semibold">Acte medical</th>
                  <th className="px-4 py-3 font-semibold">Tarif officiel</th>
                  <th className="px-4 py-3 font-semibold">Essential Care (400$)</th>
                  <th className="px-4 py-3 font-semibold">Care Plus (750$)</th>
                  <th className="px-4 py-3 font-semibold">Care Max (1400$)</th>
                </tr>
              </thead>
              <tbody>
                {healthComparisonRows.map((row, index) => (
                  <tr key={row.act} className={index % 2 === 0 ? "bg-white" : "bg-ms-cream/70"}>
                    <td className="px-4 py-3 font-medium text-ms-ink">{row.act}</td>
                    <td className="px-4 py-3 text-ms-ink/85">{row.price}</td>
                    <td className="px-4 py-3 text-ms-ink/85">{row.essential}</td>
                    <td className="px-4 py-3 text-ms-ink/85">{row.plus}</td>
                    <td className="px-4 py-3 font-semibold text-[#1f7b53]">{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface p-6 lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Guide Sante Contractuel 2026</p>
            <h2 className="mt-1 font-display text-4xl text-ms-navy">Contenu complet du dossier PDF</h2>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {healthFormulaCards.map((card) => (
              <article key={card.name} className="rounded-2xl border border-ms-navy/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">{card.level}</p>
                <h3 className="mt-2 font-display text-3xl text-ms-navy">{card.name}</h3>
                <p className="mt-2 text-lg font-semibold text-ms-gold">{card.premium}</p>
                <ul className="mt-4 space-y-2 text-sm text-ms-ink/85">
                  {card.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ms-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-ms-gold/35 bg-gradient-to-b from-[#fffaf0] to-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Options speciales</p>
              <div className="gold-divider my-4" />
              <ul className="space-y-3 text-sm text-ms-ink/90">
                {healthExtensions.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ms-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-ms-navy/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Conditions generales d&apos;assurance</p>
              <div className="gold-divider my-4" />
              <ul className="space-y-3 text-sm text-ms-ink/90">
                {healthGeneralConditions.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ms-navy" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mt-6 rounded-2xl border border-ms-navy/10 bg-white p-5 text-sm text-ms-ink/85">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ms-navy-soft">Souscription & contact</p>
            <p className="mt-3">
              Mercer & Stellaria Insurance Group - Executive Tower, Rockford Hills, Los Santos. Contact annuaire
              Services ou Discord officiel pour souscription et declaration de sinistre medical.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
