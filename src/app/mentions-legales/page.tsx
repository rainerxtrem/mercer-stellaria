import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";

export default function MentionsLegalesPage() {
  return (
    <div className="brand-shell brand-lattice flex min-h-screen flex-col">
      <MarketingHeader activeTab="HOME" title="Mercer & Stellaria Corporation" subtitle="Mentions légales" />
      <main className="mx-auto w-full max-w-[980px] px-4 pb-12 pt-6 lg:px-8">
        <section className="surface p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">Informations légales</p>
          <h1 className="mt-3 font-display text-5xl text-ms-navy">Mentions légales</h1>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-ms-ink/85">
            <p><strong>Éditeur:</strong> Mercer & Stellaria Corporation.</p>
            <p><strong>Activités:</strong> holding de coordination, prestations juridiques et activités d'assurance via entités dédiées.</p>
            <p><strong>Réglementation:</strong> références, agréments et obligations selon l'entité opérationnelle concernée.</p>
            <p><strong>Contact:</strong> via les espaces clients et formulaires officiels de la plateforme.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
