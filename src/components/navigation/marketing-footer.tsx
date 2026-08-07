import Link from "next/link";
import { BadgeCheck, Lock, Scale } from "lucide-react";

const trustItems = [
  {
    title: "Donnees securisees (SSL)",
    text: "Flux chiffres et protection des espaces clients sur l'ensemble du parcours.",
    Icon: Lock,
  },
  {
    title: "Conformite reglementaire",
    text: "References ORIAS, obligations de gouvernance et engagements de controle interne.",
    Icon: BadgeCheck,
  },
  {
    title: "Cadre juridique clair",
    text: "Information legale, traitement des donnees et conditions d'usage accessibles en permanence.",
    Icon: Scale,
  },
];

export function MarketingFooter() {
  return (
    <footer className="mt-8 border-t border-ms-navy/12 bg-gradient-to-b from-[#f4f8ff] via-[#f8fbff] to-[#eef4ff]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-9 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">Mercer & Stellaria Corporation</p>
            <h2 className="mt-3 font-display text-4xl text-ms-navy md:text-5xl">Confiance, conformite, lisibilite.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ms-ink/80 md:text-base">
              Le groupe structure ses activites autour de standards de securite, de transparence et de conformite,
              avec une attention particuliere aux parcours clients assurances.
            </p>
            <p className="mt-4 rounded-2xl border border-ms-gold/45 bg-[#fff9ee] px-4 py-3 text-xs leading-5 text-ms-ink/80">
              Agrements et references: ORIAS (selon entite concernee), obligations RGPD et cadres reglementaires applicables aux activites du groupe.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {trustItems.map(({ title, text, Icon }) => (
              <article key={title} className="rounded-2xl border border-ms-navy/12 bg-white/92 p-4 shadow-[0_14px_32px_rgba(15,32,67,0.08)]">
                <div className="inline-flex rounded-full border border-ms-navy/18 bg-ms-navy/5 p-2 text-ms-navy">
                  <Icon size={16} />
                </div>
                <p className="mt-3 text-sm font-semibold text-ms-navy">{title}</p>
                <p className="mt-1 text-xs leading-5 text-ms-ink/75">{text}</p>
              </article>
            ))}
          </section>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-ms-navy/12 pt-5 text-xs text-ms-ink/75 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Mercer & Stellaria Corporation. Tous droits reserves.</p>
          <nav className="flex flex-wrap items-center gap-4" aria-label="Liens legaux">
            <Link href="/mentions-legales" className="font-semibold text-ms-navy hover:text-ms-navy-soft">Mentions legales</Link>
            <Link href="/politique-confidentialite" className="font-semibold text-ms-navy hover:text-ms-navy-soft">Politique de confidentialite (RGPD)</Link>
            <Link href="/cgu" className="font-semibold text-ms-navy hover:text-ms-navy-soft">CGU</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
