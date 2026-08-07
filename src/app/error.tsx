"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ms-ink/50">Erreur</p>
      <h1 className="font-serif text-3xl text-ms-ink">Une erreur inattendue est survenue</h1>
      <p className="text-sm text-ms-ink/70">
        L&apos;incident a été enregistré. Vous pouvez réessayer ou revenir à l&apos;accueil.
      </p>
      {error.digest ? <p className="text-xs text-ms-ink/45">Référence technique : {error.digest}</p> : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-ms-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-full border border-ms-ink/20 px-5 py-2.5 text-sm font-semibold text-ms-ink transition hover:bg-ms-ink/5"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </main>
  );
}
