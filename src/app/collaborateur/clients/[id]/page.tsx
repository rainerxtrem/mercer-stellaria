"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { RoleSwitcher } from "@/components/navigation/role-switcher";
import { SectionBlock } from "@/components/dashboard/section-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClaimStatusLabel, getContractStatusLabel, getSubscriptionRequestStatusLabel } from "@/lib/status-mapping";
import { type RiskQuestionKey } from "@/lib/risk";

type DossierResponse = {
  client: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    birthDate: string | null;
    citizenUniqueId: string | null;
    riskQuestionnaire: Record<RiskQuestionKey, number> | null;
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
  riskHistory: Array<{
    id: string;
    createdAt: string;
    oldAnswers: Record<RiskQuestionKey, number> | null;
    newAnswers: Record<RiskQuestionKey, number>;
    oldScore: number | null;
    newScore: number;
    oldLabel: string | null;
    newLabel: string;
    actor: {
      id: string;
      fullName: string;
      email: string;
      role: string;
    } | null;
  }>;
};

const riskQuestions: Array<{ key: RiskQuestionKey; label: string }> = [
  { key: "medicalHistoryRisk", label: "Antécédents médicaux" },
  { key: "lifestyleRisk", label: "Mode de vie" },
  { key: "occupationRisk", label: "Activité professionnelle" },
  { key: "drivingExposure", label: "Conduite" },
  { key: "homeSecurityRisk", label: "Sécurité du domicile" },
  { key: "claimsHistoryRisk", label: "Historique sinistres" },
  { key: "highValueAssetsRisk", label: "Biens de valeur" },
];

export default function CollaborateurClientDossierPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [status, setStatus] = useState("");
  const [data, setData] = useState<DossierResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    birthDate: "",
    citizenUniqueId: "",
    answers: {
      medicalHistoryRisk: 0,
      lifestyleRisk: 0,
      occupationRisk: 0,
      drivingExposure: 0,
      homeSecurityRisk: 0,
      claimsHistoryRisk: 0,
      highValueAssetsRisk: 0,
    } as Record<RiskQuestionKey, number>,
  });

  const loadDossier = useCallback(async () => {
    const response = await fetch(`/api/clients/${clientId}`);
    if (!response.ok) {
      setStatus("Impossible de charger la fiche client.");
      return;
    }

    const payload = await response.json();
    const nextData = payload.data as DossierResponse;
    setData(nextData);
    setForm({
      fullName: nextData.client.fullName,
      phone: nextData.client.phone ?? "",
      birthDate: nextData.client.birthDate ? nextData.client.birthDate.slice(0, 10) : "",
      citizenUniqueId: nextData.client.citizenUniqueId ?? "",
      answers: {
        medicalHistoryRisk: nextData.client.riskQuestionnaire?.medicalHistoryRisk ?? 0,
        lifestyleRisk: nextData.client.riskQuestionnaire?.lifestyleRisk ?? 0,
        occupationRisk: nextData.client.riskQuestionnaire?.occupationRisk ?? 0,
        drivingExposure: nextData.client.riskQuestionnaire?.drivingExposure ?? 0,
        homeSecurityRisk: nextData.client.riskQuestionnaire?.homeSecurityRisk ?? 0,
        claimsHistoryRisk: nextData.client.riskQuestionnaire?.claimsHistoryRisk ?? 0,
        highValueAssetsRisk: nextData.client.riskQuestionnaire?.highValueAssetsRisk ?? 0,
      },
    });
  }, [clientId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Enregistrement des modifications...");

    const response = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const apiError =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Impossible de modifier la fiche client.";
      setStatus(apiError);
      setSaving(false);
      return;
    }

    await loadDossier();
    setStatus("Fiche client mise à jour avec succès.");
    setSaving(false);
  }

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
          {status ? (
            <div className="fixed right-5 top-5 z-[80] w-full max-w-sm">
              <div className="rounded-xl border border-ms-navy/15 bg-white/95 px-4 py-3 text-sm font-semibold text-ms-navy shadow-lg backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <p>{status}</p>
                  <button
                    type="button"
                    aria-label="Fermer la notification"
                    className="rounded-md px-1 py-0.5 text-xs font-bold opacity-70 hover:opacity-100"
                    onClick={() => setStatus("")}
                  >
                    x
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <RoleSwitcher currentPath="/collaborateur" />
          <p className="surface mt-6 px-4 py-3 text-sm text-ms-navy">Chargement du dossier...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
      <div className="workspace-grid mx-auto grid w-full max-w-7xl gap-6">
        {status ? (
          <div className="fixed right-5 top-5 z-[80] w-full max-w-sm">
            <div className="rounded-xl border border-ms-navy/15 bg-white/95 px-4 py-3 text-sm font-semibold text-ms-navy shadow-lg backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <p>{status}</p>
                <button
                  type="button"
                  aria-label="Fermer la notification"
                  className="rounded-md px-1 py-0.5 text-xs font-bold opacity-70 hover:opacity-100"
                  onClick={() => setStatus("")}
                >
                  x
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <RoleSwitcher currentPath="/collaborateur" />

        <header className="surface workspace-hero p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-ms-navy-soft">Fiche individuelle client</p>
              <h1 className="mt-2 font-display text-4xl text-ms-navy">{data.client.fullName}</h1>
              <p className="mt-2 text-sm text-ms-ink/75">{data.client.phone ?? "Téléphone non renseigné"}</p>
              <p className="mt-1 text-sm text-ms-ink/75">ID Citoyen Unique: {data.client.citizenUniqueId ?? "Non renseigné"}</p>
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
          <SectionBlock title="Édition fiche client" subtitle="Réservé aux rôles Admin et Collaborator">
            <form className="space-y-4" onSubmit={handleSave}>
              <label className="grid gap-1 text-sm text-ms-ink/85">
                Nom complet
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
              </label>
              <label className="grid gap-1 text-sm text-ms-ink/85">
                Téléphone
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
              </label>
              <label className="grid gap-1 text-sm text-ms-ink/85">
                Date de naissance
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
              </label>
              <label className="grid gap-1 text-sm text-ms-ink/85">
                ID Citoyen Unique
                <input
                  value={form.citizenUniqueId}
                  onChange={(event) => setForm((prev) => ({ ...prev, citizenUniqueId: event.target.value }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
              </label>
              <div className="grid gap-3 rounded-2xl border border-ms-navy/10 bg-white p-4">
                <p className="text-sm font-semibold text-ms-navy">Questionnaire de risque</p>
                {riskQuestions.map((question) => (
                  <label key={question.key} className="grid gap-1 text-sm text-ms-ink/85">
                    {question.label}
                    <select
                      value={form.answers[question.key]}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          answers: {
                            ...prev.answers,
                            [question.key]: Number(event.target.value),
                          },
                        }))
                      }
                      className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    >
                      <option value={0}>0 - Très faible</option>
                      <option value={1}>1 - Faible</option>
                      <option value={2}>2 - Moyen</option>
                      <option value={3}>3 - Élevé</option>
                    </select>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={saving} className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </form>
          </SectionBlock>

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

        <SectionBlock title="Historique du risque" subtitle="Traçabilité complète des modifications du questionnaire">
          <div className="space-y-3">
            {data.riskHistory.length === 0 ? (
              <p className="text-sm text-ms-ink/70">Aucune modification enregistrée.</p>
            ) : (
              data.riskHistory.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-ms-navy/10 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ms-navy">
                      {entry.actor?.fullName ?? "Système"} • {new Date(entry.createdAt).toLocaleString("fr-FR")}
                    </p>
                    <span className="text-xs text-ms-ink/70">
                      Score {entry.oldScore ?? "-"} → {entry.newScore} | {entry.oldLabel ?? "-"} → {entry.newLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ms-navy-soft">Anciennes valeurs</p>
                      <pre className="mt-2 overflow-auto rounded-lg bg-ms-pearl p-3 text-xs text-ms-ink/85">{JSON.stringify(entry.oldAnswers, null, 2)}</pre>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ms-navy-soft">Nouvelles valeurs</p>
                      <pre className="mt-2 overflow-auto rounded-lg bg-ms-pearl p-3 text-xs text-ms-ink/85">{JSON.stringify(entry.newAnswers, null, 2)}</pre>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionBlock>

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
      </div>
    </main>
  );
}
