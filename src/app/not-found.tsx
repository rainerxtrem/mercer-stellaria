import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ms-ink/50">Erreur 404</p>
      <h1 className="font-serif text-3xl text-ms-ink">Cette page est introuvable</h1>
      <p className="text-sm text-ms-ink/70">
        Le lien est peut-être obsolète, ou vous n&apos;avez pas accès à cette ressource.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-ms-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
