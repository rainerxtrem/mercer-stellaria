import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";

export default function MentionsLegalesPage() {
  return (
    <div className="brand-shell brand-lattice flex min-h-screen flex-col">
      <MarketingHeader activeTab="HOME" title="Mercer & Stellaria Corporation" subtitle="Mentions legales" />
      <main className="mx-auto w-full max-w-[980px] px-4 pb-12 pt-6 lg:px-8">
        <section className="surface p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">Informations legales</p>
          <h1 className="mt-3 font-display text-5xl text-ms-navy">Mentions legales</h1>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-ms-ink/85">
            <p><strong>Editeur:</strong> Mercer & Stellaria Corporation.</p>
            <p><strong>Activites:</strong> holding de coordination, prestations juridiques et activites d'assurance via entites dediees.</p>
            <p><strong>Reglementation:</strong> references, agrements et obligations selon l'entite operationnelle concernee.</p>
            <p><strong>Contact:</strong> via les espaces clients et formulaires officiels de la plateforme.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
