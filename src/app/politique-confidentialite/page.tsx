import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="brand-shell brand-lattice flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-[980px] px-4 pb-12 pt-6 lg:px-8">
        <section className="surface p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">Protection des données</p>
          <h1 className="mt-3 font-display text-5xl text-ms-navy">Politique de confidentialité</h1>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-ms-ink/85">
            <p>Nous traitons les données personnelles dans le respect du RGPD et des obligations locales applicables.</p>
            <p>Les données sont utilisées pour la gestion des comptes, contrats, sinistres et échanges client-conseiller.</p>
            <p>Vous disposez des droits d'accès, de rectification, d'opposition et de suppression selon les conditions légales.</p>
            <p>Les flux sont sécurisés, tracés et limités aux finalités légitimes déclarées.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
