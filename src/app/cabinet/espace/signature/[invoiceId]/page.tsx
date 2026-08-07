"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function InvoiceSignaturePage({ params }: { params: { invoiceId: string } }) {
  const router = useRouter();
  const { status } = useSession();
  const [invoiceId, setInvoiceId] = useState<string>(params.invoiceId);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setInvoiceId(params.invoiceId);
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?service=law_firm");
    }
  }, [router, status]);

  async function signInvoice() {
    const response = await fetch(`/api/law-firm/invoices/${invoiceId}/sign`, { method: "POST" });
    setStatusMessage(response.ok ? "Document signé." : "Signature impossible.");
  }

  if (status === "loading") {
    return <main className="workspace-shell mx-auto w-full max-w-[900px] px-4 py-8"><p className="text-sm text-ms-ink/70">Chargement du module de signature...</p></main>;
  }

  return (
    <main className="workspace-shell mx-auto w-full max-w-[900px] px-4 py-8">
      <section className="surface p-6 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ms-navy-soft">Signature sécurisée</p>
        <h1 className="mt-2 font-display text-4xl text-ms-navy">Consulter et signer</h1>
        <p className="mt-2 text-sm text-ms-ink/75">Le document est en attente de signature. Vérifiez-le puis validez l'opération.</p>
        <button onClick={signInvoice} className="mt-6 rounded-full bg-ms-navy px-5 py-3 text-sm font-semibold text-white">Signer le document</button>
        {statusMessage ? <p className="mt-4 text-sm text-ms-navy">{statusMessage}</p> : null}
      </section>
    </main>
  );
}
