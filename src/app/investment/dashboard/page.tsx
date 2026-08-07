"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AdvisorRequestModal } from "@/components/dashboard/advisor-request-modal";
import { SectionBlock } from "@/components/dashboard/section-block";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DataTable } from "@/components/dashboard/data-table";
import { RoleModeSwitch } from "@/components/dashboard/role-mode-switch";
import { RiskProfileModal } from "@/components/dashboard/risk-profile-modal";
import { AppRole } from "@/lib/rbac";
import { buildEmptyOperationalDataset, ManagerClientRow } from "@/components/dashboard/operational-mock";

type InvestmentMode = "CLIENT" | "MANAGER";

type ClientApiRow = {
  id: string;
  fullName: string;
  riskLabel: string | null;
  citizenUniqueId: string | null;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR")} €`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function resolveRiskProfile(label: string | null): "Prudent" | "Equilibre" | "Dynamique" {
  if (label === "FAIBLE") {
    return "Prudent";
  }

  if (label === "ELEVE") {
    return "Dynamique";
  }

  return "Equilibre";
}

export default function InvestmentDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const isManager = role === "COLLABORATOR" || role === "ADMIN";

  const [mode, setMode] = useState<InvestmentMode>("CLIENT");
  const [managerClients, setManagerClients] = useState<ManagerClientRow[]>([]);
  const [riskFilter, setRiskFilter] = useState<"ALL" | "Prudent" | "Equilibre" | "Dynamique">("ALL");
  const [requestModal, setRequestModal] = useState<null | "appointment" | "arbitrage">(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?service=investment");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      setMode(isManager ? "MANAGER" : "CLIENT");
    }
  }, [isManager, status]);

  const dataset = useMemo(() => buildEmptyOperationalDataset("investment", role), [role]);

  useEffect(() => {
    if (!isManager) {
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/clients?scope=all");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const rows = (payload.data ?? []) as ClientApiRow[];
        const mapped: ManagerClientRow[] = rows.map((client) => ({
          id: client.id,
          fullName: client.fullName,
          assetsUnderManagement: null,
          riskProfile: resolveRiskProfile(client.riskLabel),
          kycStatus: client.citizenUniqueId ? "A jour" : "A verifier",
        }));

        setManagerClients(mapped);
      } catch {
        setManagerClients([]);
      }
    })();
  }, [isManager]);

  const managerRows = useMemo(() => {
    const source = managerClients.length > 0 ? managerClients : dataset.managerClients;
    if (riskFilter === "ALL") {
      return source;
    }

    return source.filter((row) => row.riskProfile === riskFilter);
  }, [dataset.managerClients, managerClients, riskFilter]);

  const managerMetrics = [
    { label: "Clients suivis", value: String(managerRows.length), detail: "Portefeuille total" },
    {
      label: "Encours géré",
      value: "À connecter",
      detail: "En attente de liaison aux encours réels",
    },
    {
      label: "KYC à vérifier",
      value: String(managerRows.filter((row) => row.kycStatus === "A verifier").length),
      detail: "Action conformité requise",
    },
  ];

  if (status === "loading") {
    return (
      <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8">
        <p className="text-sm text-ms-ink/70">Chargement sécurisé de votre espace investment...</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  function exportManagerReport() {
    downloadCsv(
      "rapport-investment.csv",
      ["Nom du client", "Encours géré", "Profil de risque", "Statut KYC"],
      managerRows.map((row) => [
        row.fullName,
        row.assetsUnderManagement === null ? "A connecter" : formatCurrency(row.assetsUnderManagement),
        row.riskProfile,
        row.kycStatus,
      ]),
    );
    setFeedbackMessage("Le rapport investment a été généré au format CSV.");
  }

  function applyRiskProfile(clientId: string, riskProfile: "Prudent" | "Equilibre" | "Dynamique") {
    setManagerClients((current) => current.map((row) => (row.id === clientId ? { ...row, riskProfile } : row)));
    setFeedbackMessage("Le profil de risque a été mis à jour localement et est prêt à être relié à l'API.");
  }

  return (
    <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-4 lg:px-8 lg:py-6">
      <div className="workspace-grid grid gap-4 lg:gap-6">
        <header className="workspace-hero">
          <p className="workspace-kicker">Investment</p>
          <h1 className="workspace-title">Dashboard Investment</h1>
          <p className="workspace-subtitle">Suivi investisseur et pilotage gestionnaire sur une base de composants partagés.</p>
        </header>

        <RoleModeSwitch mode={mode} onModeChange={setMode} canUseManagerMode={isManager} />

        {feedbackMessage ? (
          <div className="rounded-2xl border border-ms-gold/35 bg-ms-gold/10 px-5 py-4 text-sm font-semibold text-ms-navy">
            {feedbackMessage}
          </div>
        ) : null}

        {mode === "CLIENT" ? (
          <>
            <MetricsGrid items={dataset.clientMetrics} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />

            <SectionBlock title="Répartition du portefeuille" subtitle="Vue consolidée des positions">
              <DataTable
                rows={dataset.positions}
                emptyText="Aucune position à afficher."
                columns={[
                  { key: "fund", header: "Nom du fonds", render: (row) => row.name },
                  { key: "asset", header: "Type d'actif", render: (row) => row.category },
                  { key: "amount", header: "Montant", render: (row) => formatCurrency(row.amount) },
                  {
                    key: "performance",
                    header: "Performance",
                    render: (row) => (
                      <span className={row.performancePct >= 0 ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                        {row.performancePct.toFixed(2)} %
                      </span>
                    ),
                  },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Historique des transactions" subtitle="Derniers mouvements d'investissement">
              <DataTable
                rows={dataset.history}
                emptyText="Aucun mouvement récent."
                columns={[
                  { key: "date", header: "Date", render: (row) => new Date(row.date).toLocaleDateString("fr-FR") },
                  { key: "operation", header: "Opération", render: (row) => row.label },
                  {
                    key: "amount",
                    header: "Montant",
                    render: (row) => (
                      <span className={row.amount >= 0 ? "text-ms-navy" : "text-rose-700"}>{formatCurrency(row.amount)}</span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Statut",
                    render: (row) => (
                      <span className="rounded-full border border-ms-navy/20 px-2.5 py-1 text-xs font-semibold text-ms-navy">
                        {row.status === "EXECUTEE" ? "Exécutée" : "En cours"}
                      </span>
                    ),
                  },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Actions rapides" subtitle="Contacts et demandes prioritaires">
              <QuickActions
                actions={[
                  { label: "Prendre RDV avec mon conseiller", onClick: () => setRequestModal("appointment") },
                  { label: "Demander un arbitrage", tone: "secondary", onClick: () => setRequestModal("arbitrage") },
                ]}
              />
            </SectionBlock>
          </>
        ) : (
          <>
            <MetricsGrid items={managerMetrics} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />

            <SectionBlock title="Portefeuille clients" subtitle="Encours, risque et conformité KYC">
              <div className="mb-4 flex justify-end">
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as "ALL" | "Prudent" | "Equilibre" | "Dynamique")}
                  className="rounded-lg border border-ms-navy/20 bg-white px-3 py-2 text-xs font-semibold text-ms-navy"
                >
                  <option value="ALL">Tous les profils</option>
                  <option value="Prudent">Prudent</option>
                  <option value="Equilibre">Équilibré</option>
                  <option value="Dynamique">Dynamique</option>
                </select>
              </div>
              <DataTable
                rows={managerRows}
                emptyText="Aucune cliente investisseur trouvée."
                minWidthClassName="min-w-[940px]"
                columns={[
                  { key: "name", header: "Nom du client", render: (row) => row.fullName },
                  { key: "aum", header: "Encours géré", render: (row) => (row.assetsUnderManagement === null ? "À connecter" : formatCurrency(row.assetsUnderManagement)) },
                  { key: "risk", header: "Profil de risque", render: (row) => row.riskProfile },
                  {
                    key: "kyc",
                    header: "Statut conformité (KYC)",
                    render: (row) => (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.kycStatus === "A jour" ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : "border border-amber-300 bg-amber-50 text-amber-800"}`}>
                        {row.kycStatus}
                      </span>
                    ),
                  },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Actions gestionnaire" subtitle="Pilotage de la relation et de la performance">
              <QuickActions
                actions={[
                  { label: "Générer un rapport de performance", onClick: exportManagerReport },
                  { label: "Mettre à jour le profil de risque", tone: "secondary", onClick: () => setIsRiskModalOpen(true) },
                ]}
              />
            </SectionBlock>
          </>
        )}
      </div>

      <AdvisorRequestModal
        isOpen={requestModal !== null}
        service="investment"
        requestType={requestModal ?? "appointment"}
        onClose={() => setRequestModal(null)}
        onSubmitted={setFeedbackMessage}
      />

      <RiskProfileModal
        isOpen={isRiskModalOpen}
        rows={managerRows}
        onClose={() => setIsRiskModalOpen(false)}
        onSave={applyRiskProfile}
      />
    </main>
  );
}
