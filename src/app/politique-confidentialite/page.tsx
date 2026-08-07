import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="brand-shell brand-lattice flex min-h-screen flex-col">
      <MarketingHeader activeTab="HOME" title="Mercer & Stellaria Corporation" subtitle="Confidentialite RGPD" />
      <main className="mx-auto w-full max-w-[980px] px-4 pb-12 pt-6 lg:px-8">
        <section className="surface p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">Protection des donnees</p>
          <h1 className="mt-3 font-display text-5xl text-ms-navy">Politique de confidentialite</h1>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-ms-ink/85">
            <p>Nous traitons les donnees personnelles dans le respect du RGPD et des obligations locales applicables.</p>
            <p>Les donnees sont utilisees pour la gestion des comptes, contrats, sinistres et echanges client-conseiller.</p>
            <p>Vous disposez des droits d'acces, de rectification, d'opposition et de suppression selon les conditions legales.</p>
            <p>Les flux sont securises, traces et limites aux finalites legitimes declarees.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
