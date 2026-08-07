import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingHeader } from "@/components/navigation/marketing-header";

export default function CguPage() {
  return (
    <div className="brand-shell brand-lattice flex min-h-screen flex-col">
      <MarketingHeader activeTab="HOME" title="Mercer & Stellaria Corporation" subtitle="Conditions générales" />
      <main className="mx-auto w-full max-w-[980px] px-4 pb-12 pt-6 lg:px-8">
        <section className="surface p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ms-navy-soft">Conditions d'utilisation</p>
          <h1 className="mt-3 font-display text-5xl text-ms-navy">CGU</h1>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-ms-ink/85">
            <p>L'utilisation de la plateforme implique l'acceptation des présentes conditions générales d'utilisation.</p>
            <p>L'utilisateur s'engage à fournir des informations exactes et à protéger ses identifiants d'accès.</p>
            <p>Mercer & Stellaria Corporation peut ajuster ses services pour raisons légales, de sécurité ou d'évolution produit.</p>
            <p>En cas de litige, les voies de résolution amiable et le cadre de compétence applicable sont privilégiés.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
