"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RoleSwitcher } from "@/components/navigation/role-switcher";
import { SectionBlock } from "@/components/dashboard/section-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClaimStatusLabel, getContractStatusLabel, getSubscriptionRequestStatusLabel } from "@/lib/status-mapping";

type DossierResponse = {
  client: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    birthDate: string | null;
    riskLabel: string | null;
    riskScore: number | null;
    isArchived: boolean;
    archivedAt: string | null;
    createdAt: string;
  };
  contracts: Array<{
    id: string;
    contractNumber: string;
    formulaName: string;
    status: string;
    weeklyPremium: string | number;
    createdAt: string;
  }>;
  claims: Array<{
    id: string;
    claimNumber: string;
    incidentType: string;
    status: string;
    requestedAmount: string | number | null;
    approvedAmount: string | number | null;
    declaredAt: string;
  }>;
  requests: Array<{
    id: string;
    requestNumber: string;
    type: "NEW_SUBSCRIPTION" | "UPGRADE";
    requestedFormula: string;
    status: string;
    advisorValidated: boolean;
    createdAt: string;
  }>;
};

export default function CollaborateurClientDossierPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [status, setStatus] = useState("");
  const [data, setData] = useState<DossierResponse | null>(null);

  const loadDossier = useCallback(async () => {
    const response = await fetch(`/api/clients/${clientId}`);
    if (!response.ok) {
      setStatus("Impossible de charger la fiche client.");
      return;
    }

    const payload = await response.json();
    setData(payload.data as DossierResponse);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDossier().catch(() => setStatus("Erreur de chargement."));
  }, [clientId, loadDossier]);

  if (!data) {
    return (
      <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
        <div className="workspace-grid mx-auto w-full max-w-7xl">
          <RoleSwitcher currentPath="/collaborateur" />
          <p className="surface mt-6 px-4 py-3 text-sm text-ms-navy">Chargement du dossier...</p>
          {status ? <p className="surface mt-3 px-4 py-3 text-sm text-ms-navy">{status}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
      <div className="workspace-grid mx-auto grid w-full max-w-7xl gap-6">
        <RoleSwitcher currentPath="/collaborateur" />

        <header className="surface workspace-hero p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-ms-navy-soft">Fiche individuelle client</p>
              <h1 className="mt-2 font-display text-4xl text-ms-navy">{data.client.fullName}</h1>
              <p className="mt-2 text-sm text-ms-ink/75">{data.client.phone ?? "Téléphone non renseigné"}</p>
            </div>
            <Link href="/collaborateur" className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy">
              Retour portefeuille
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-ms-gold/45 bg-ms-gold/10 px-3 py-1 text-xs font-semibold text-ms-navy">
              Risque: {data.client.riskLabel ?? "Non évalué"}
            </span>
            <span className="rounded-full border border-ms-navy/20 bg-white px-3 py-1 text-xs font-semibold text-ms-navy">
              Dossier {data.client.isArchived ? "Archivé" : "Actif"}
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <SectionBlock title="Contrats" subtitle="Toutes les formules rattachées au client">
            <div className="space-y-3">
              {data.contracts.map((contract) => (
                <div key={contract.id} className="rounded-xl border border-ms-navy/10 bg-white p-4">
                  <p className="font-semibold text-ms-navy">{contract.contractNumber}</p>
                  <p className="text-xs text-ms-ink/70">{contract.formulaName} - {contract.weeklyPremium} $/sem</p>
                  <div className="mt-2">
                    <StatusBadge {...getContractStatusLabel(contract.status)} />
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>

          <SectionBlock title="Demandes formules" subtitle="Souscriptions et upgrades soumis depuis l'espace client">
            <div className="space-y-3">
              {data.requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-ms-navy/10 bg-white p-4">
                  <p className="font-semibold text-ms-navy">{request.requestNumber}</p>
                  <p className="text-xs text-ms-ink/70">{request.type === "UPGRADE" ? "Upgrade" : "Souscription"} - {request.requestedFormula}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge {...getSubscriptionRequestStatusLabel(request.status)} />
                    <span className="text-xs text-ms-ink/65">{request.advisorValidated ? "Validation conseiller OK" : "Validation conseiller en attente"}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>
        </section>

        <SectionBlock title="Historique sinistres" subtitle="Suivi détaillé des déclarations du client">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-ms-navy-soft">
                <tr>
                  <th className="pb-3">Numéro</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Demande</th>
                  <th className="pb-3">Valide</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="text-ms-ink/85">
                {data.claims.map((claim) => (
                  <tr key={claim.id} className="border-t border-ms-navy/10">
                    <td className="py-3">{claim.claimNumber}</td>
                    <td className="py-3">{claim.incidentType}</td>
                    <td className="py-3"><StatusBadge {...getClaimStatusLabel(claim.status)} /></td>
                    <td className="py-3">{claim.requestedAmount ?? "-"}</td>
                    <td className="py-3">{claim.approvedAmount ?? "-"}</td>
                    <td className="py-3">{new Date(claim.declaredAt).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>

        {status ? <p className="surface px-4 py-3 text-sm font-medium text-ms-navy">{status}</p> : null}
      </div>
    </main>
  );
}
