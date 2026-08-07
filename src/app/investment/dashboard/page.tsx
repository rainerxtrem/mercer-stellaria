"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { SectionBlock } from "@/components/dashboard/section-block";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DataTable } from "@/components/dashboard/data-table";
import { RoleModeSwitch } from "@/components/dashboard/role-mode-switch";
import { RoleSwitcher } from "@/components/navigation/role-switcher";

type InvestmentMode = "CLIENT" | "MANAGER";

type PortfolioRow = {
  fundName: string;
  assetType: string;
  amount: number;
  performancePct: number;
};

type TransactionRow = {
  date: string;
  operation: string;
  amount: number;
  status: "EXECUTEE" | "EN_COURS";
};

type ManagerClientRow = {
  id: string;
  fullName: string;
  assetsUnderManagement: number;
  riskProfile: "Prudent" | "Equilibre" | "Dynamique";
  kycStatus: "A jour" | "A verifier";
};

type ClientApiRow = {
  id: string;
  fullName: string;
  riskLabel: string | null;
  citizenUniqueId: string | null;
};

const portfolioRows: PortfolioRow[] = [
  { fundName: "MS Private Opportunities", assetType: "Private Equity", amount: 620000, performancePct: 8.7 },
  { fundName: "MS Global Yield", assetType: "Obligataire", amount: 310000, performancePct: 4.2 },
  { fundName: "MS Select Growth", assetType: "Actions", amount: 470000, performancePct: 11.4 },
];

const transactionRows: TransactionRow[] = [
  { date: "2026-08-01", operation: "Souscription MS Select Growth", amount: 120000, status: "EXECUTEE" },
  { date: "2026-07-24", operation: "Arbitrage vers MS Global Yield", amount: 50000, status: "EXECUTEE" },
  { date: "2026-07-15", operation: "Retrait partiel", amount: -30000, status: "EN_COURS" },
];

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR")} €`;
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
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isManager = role === "COLLABORATOR" || role === "ADMIN";

  const [mode, setMode] = useState<InvestmentMode>("CLIENT");
  const [managerClients, setManagerClients] = useState<ManagerClientRow[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setMode(isManager ? "MANAGER" : "CLIENT");
  }, [isManager]);

  useEffect(() => {
    if (!isManager) {
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/clients?scope=all");
        if (!response.ok) {
          setStatusMessage("Impossible de charger la vue gestionnaire pour le moment.");
          return;
        }

        const payload = await response.json();
        const rows = (payload.data ?? []) as ClientApiRow[];
        const mapped: ManagerClientRow[] = rows.map((client, index) => ({
          id: client.id,
          fullName: client.fullName,
          assetsUnderManagement: 180000 + (index + 1) * 42000,
          riskProfile: resolveRiskProfile(client.riskLabel),
          kycStatus: client.citizenUniqueId ? "A jour" : "A verifier",
        }));

        setManagerClients(mapped);
      } catch {
        setStatusMessage("Erreur réseau lors du chargement des clientes investisseurs.");
      }
    })();
  }, [isManager]);

  const investorTotals = useMemo(() => {
    const totalAssets = portfolioRows.reduce((sum, row) => sum + row.amount, 0);
    const investedCapital: number = 1120000;
    const performance = investedCapital === 0 ? 0 : ((totalAssets - investedCapital) / investedCapital) * 100;

    return {
      totalAssets,
      investedCapital,
      performance,
    };
  }, []);

  const investorMetrics = [
    { label: "Total avoirs", value: formatCurrency(investorTotals.totalAssets), detail: "Valorisation en date du jour" },
    { label: "Performance globale", value: `${investorTotals.performance.toFixed(2)} %`, detail: "Depuis l'origine" },
    { label: "Capital investi", value: formatCurrency(investorTotals.investedCapital), detail: "Cumul des versements" },
  ];

  const managerMetrics = [
    { label: "Clients suivis", value: String(managerClients.length), detail: "Portefeuille total" },
    {
      label: "Encours géré",
      value: formatCurrency(managerClients.reduce((sum, row) => sum + row.assetsUnderManagement, 0)),
      detail: "Actifs agrégés",
    },
    {
      label: "KYC à vérifier",
      value: String(managerClients.filter((row) => row.kycStatus === "A verifier").length),
      detail: "Action conformité requise",
    },
  ];

  return (
    <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-4 lg:px-8 lg:py-6">
      <div className="workspace-grid grid gap-4 lg:gap-6">
        <RoleSwitcher currentPath="/investment/dashboard" />

        <header className="workspace-hero">
          <p className="workspace-kicker">Investment</p>
          <h1 className="workspace-title">Dashboard Investment</h1>
          <p className="workspace-subtitle">Suivi investisseur et pilotage gestionnaire sur une base de composants partagés.</p>
        </header>

        <RoleModeSwitch mode={mode} onModeChange={setMode} canUseManagerMode={isManager} />

        {mode === "CLIENT" ? (
          <>
            <MetricsGrid items={investorMetrics} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />

            <SectionBlock title="Répartition du portefeuille" subtitle="Vue consolidée des positions">
              <DataTable
                rows={portfolioRows}
                emptyText="Aucune position à afficher."
                columns={[
                  { key: "fund", header: "Nom du fonds", render: (row) => row.fundName },
                  { key: "asset", header: "Type d'actif", render: (row) => row.assetType },
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
                rows={transactionRows}
                emptyText="Aucun mouvement récent."
                columns={[
                  { key: "date", header: "Date", render: (row) => new Date(row.date).toLocaleDateString("fr-FR") },
                  { key: "operation", header: "Opération", render: (row) => row.operation },
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
                  { label: "Prendre RDV avec mon conseiller", href: "/connexion?service=investment" },
                  { label: "Demander un arbitrage", href: "/connexion?service=investment", tone: "secondary" },
                ]}
              />
            </SectionBlock>
          </>
        ) : (
          <>
            <MetricsGrid items={managerMetrics} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />

            <SectionBlock title="Portefeuille clients" subtitle="Encours, risque et conformité KYC">
              <DataTable
                rows={managerClients}
                emptyText="Aucune cliente investisseur trouvée."
                minWidthClassName="min-w-[940px]"
                columns={[
                  { key: "name", header: "Nom du client", render: (row) => row.fullName },
                  { key: "aum", header: "Encours géré", render: (row) => formatCurrency(row.assetsUnderManagement) },
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
                  { label: "Générer un rapport de performance" },
                  { label: "Mettre à jour le profil de risque", tone: "secondary" },
                ]}
              />
              {statusMessage ? <p className="mt-3 text-sm text-rose-700">{statusMessage}</p> : null}
            </SectionBlock>
          </>
        )}
      </div>
    </main>
  );
}
