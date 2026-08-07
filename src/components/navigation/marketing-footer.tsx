import Link from "next/link";
import { BadgeCheck, Lock, Scale } from "lucide-react";

const trustItems = [
  {
    title: "Données sécurisées (SSL)",
    text: "Flux chiffrés et protection des espaces clients sur l'ensemble du parcours.",
    Icon: Lock,
  },
  {
    title: "Conformité réglementaire",
    text: "Références IPMI, obligations de gouvernance et engagements de contrôle interne.",
    Icon: BadgeCheck,
  },
  {
    title: "Cadre juridique clair",
    text: "Information légale, traitement des données et conditions d'usage accessibles en permanence.",
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
            <h2 className="mt-3 font-display text-4xl text-ms-navy md:text-5xl">Confiance, conformité, lisibilité.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ms-ink/80 md:text-base">
              Le groupe structure ses activités autour de standards de sécurité, de transparence et de conformité,
              avec une attention particulière aux parcours clients assurances.
            </p>
            <p className="mt-4 rounded-2xl border border-ms-gold/45 bg-[#fff9ee] px-4 py-3 text-xs leading-5 text-ms-ink/80">
              Agréments et références: IPMI (selon entité concernée), obligations RGPD et cadres réglementaires applicables aux activités du groupe.
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
          <p>© {new Date().getFullYear()} Mercer & Stellaria Corporation. Tous droits réservés.</p>
          <nav className="flex flex-wrap items-center gap-4" aria-label="Liens légaux">
            <Link href="/mentions-legales" className="font-semibold text-ms-navy hover:text-ms-navy-soft">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="font-semibold text-ms-navy hover:text-ms-navy-soft">Politique de confidentialité (RGPD)</Link>
            <Link href="/cgu" className="font-semibold text-ms-navy hover:text-ms-navy-soft">CGU</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
