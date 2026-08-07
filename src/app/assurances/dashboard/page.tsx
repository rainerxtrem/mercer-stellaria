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

type AssuranceMode = "CLIENT" | "MANAGER";

type ContractRow = {
  id: string;
  contractNumber: string;
  formulaName: string;
  category: string;
  weeklyPremium: string | number;
  status: string;
};

type ClaimRow = {
  id: string;
  claimNumber: string;
  incidentType: string;
  requestedAmount: number | null;
  status: string;
  declaredAt: string;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  amount: string | number;
  status: string;
  dueDate: string;
  contract: { formulaName: string };
};

type ClientApiRow = {
  id: string;
  fullName: string;
  riskLabel: string | null;
  citizenUniqueId: string | null;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR")} $`;
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  return 0;
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

export default function AssurancesDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const isManager = role === "COLLABORATOR" || role === "ADMIN";

  const [mode, setMode] = useState<AssuranceMode>("CLIENT");
  const [managerClients, setManagerClients] = useState<ManagerClientRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [riskFilter, setRiskFilter] = useState<"ALL" | "Prudent" | "Equilibre" | "Dynamique">("ALL");
  const [requestModal, setRequestModal] = useState<null | "appointment" | "claim">(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?service=assurance");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      setMode(isManager ? "MANAGER" : "CLIENT");
    }
  }, [isManager, status]);

  const dataset = useMemo(() => buildEmptyOperationalDataset("assurance", role), [role]);

  useEffect(() => {
    if (status !== "authenticated" || isManager) {
      return;
    }

    void (async () => {
      try {
        const [contractsRes, claimsRes, invoicesRes] = await Promise.all([
          fetch("/api/contracts?scope=self"),
          fetch("/api/claims?scope=self"),
          fetch("/api/invoices?scope=self"),
        ]);

        if (contractsRes.ok) {
          const payload = await contractsRes.json();
          setContracts((payload.data ?? []) as ContractRow[]);
        }

        if (claimsRes.ok) {
          const payload = await claimsRes.json();
          setClaims((payload.data ?? []) as ClaimRow[]);
        }

        if (invoicesRes.ok) {
          const payload = await invoicesRes.json();
          setInvoices((payload.data ?? []) as InvoiceRow[]);
        }
      } catch {
        setContracts([]);
        setClaims([]);
        setInvoices([]);
      }
    })();
  }, [isManager, status]);

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

  const clientMetrics = useMemo(() => {
    if (contracts.length === 0 && claims.length === 0 && invoices.length === 0) {
      return dataset.clientMetrics;
    }

    const activeContracts = contracts.filter((contract) => contract.status !== "TERMINATED").length;
    const weeklyPremiumTotal = contracts.reduce((sum, contract) => sum + toNumber(contract.weeklyPremium), 0);
    const openClaims = claims.filter((claim) => claim.status !== "PAID" && claim.status !== "REJECTED").length;

    return [
      { label: "Contrats actifs", value: String(activeContracts), detail: "Basé sur vos contrats réels" },
      { label: "Prime hebdomadaire", value: formatCurrency(weeklyPremiumTotal), detail: "Somme des primes actives" },
      { label: "Sinistres ouverts", value: String(openClaims), detail: "Dossiers encore en cours" },
    ];
  }, [claims, contracts, dataset.clientMetrics]);

  const clientPositions = useMemo(() => contracts.map((contract) => ({
    name: `${contract.contractNumber} - ${contract.formulaName}`,
    category: contract.category,
    amount: toNumber(contract.weeklyPremium),
    status: contract.status,
  })), [contracts]);

  const clientHistory = useMemo(() => {
    const invoiceHistory = invoices.map((invoice) => ({
      date: invoice.dueDate,
      label: `Facture ${invoice.invoiceNumber} - ${invoice.contract.formulaName}`,
      amount: toNumber(invoice.amount),
      status: invoice.status,
    }));

    const claimHistory = claims.map((claim) => ({
      date: claim.declaredAt,
      label: `Sinistre ${claim.claimNumber} - ${claim.incidentType}`,
      amount: claim.requestedAmount ?? 0,
      status: claim.status,
    }));

    return [...invoiceHistory, ...claimHistory].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [claims, invoices]);

  function exportManagerReport() {
    downloadCsv(
      "rapport-assurances.csv",
      ["Nom du client", "Encours géré", "Profil de risque", "Statut KYC"],
      managerRows.map((row) => [
        row.fullName,
        row.assetsUnderManagement === null ? "A connecter" : formatCurrency(row.assetsUnderManagement),
        row.riskProfile,
        row.kycStatus,
      ]),
    );
    setFeedbackMessage("Le rapport assurance a été généré au format CSV.");
  }

  function applyRiskProfile(clientId: string, riskProfile: "Prudent" | "Equilibre" | "Dynamique") {
    setManagerClients((current) => current.map((row) => (row.id === clientId ? { ...row, riskProfile } : row)));
    setFeedbackMessage("Le profil de risque a été mis à jour localement et est prêt à être relié à l'API.");
  }

  if (status === "loading") {
    return (
      <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8">
        <p className="text-sm text-ms-ink/70">Chargement sécurisé de votre espace assurances...</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-4 lg:px-8 lg:py-6">
      <div className="workspace-grid grid gap-4 lg:gap-6">
        <header className="workspace-hero">
          <p className="workspace-kicker">Assurances</p>
          <h1 className="workspace-title">Dashboard Assurances</h1>
          <p className="workspace-subtitle">Vue assurée et vue gestionnaire alignées sur les rôles de session.</p>
        </header>

        <RoleModeSwitch mode={mode} onModeChange={setMode} canUseManagerMode={isManager} />

        {feedbackMessage ? (
          <div className="rounded-2xl border border-ms-gold/35 bg-ms-gold/10 px-5 py-4 text-sm font-semibold text-ms-navy">
            {feedbackMessage}
          </div>
        ) : null}

        {mode === "CLIENT" ? (
          <>
            <MetricsGrid items={clientMetrics} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />

            <SectionBlock title="Répartition des garanties" subtitle="Contrats, types d'actifs couverts et suivi de valeur">
              <DataTable
                rows={clientPositions}
                emptyText="Aucune garantie active."
                columns={[
                  { key: "fund", header: "Nom de la couverture", render: (row) => row.name },
                  { key: "asset", header: "Type d'actif", render: (row) => row.category },
                  { key: "amount", header: "Prime / semaine", render: (row) => formatCurrency(row.amount) },
                  { key: "status", header: "Statut", render: (row) => row.status },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Historique des opérations" subtitle="Transactions et incidents récents">
              <DataTable
                rows={clientHistory}
                emptyText="Aucune opération récente."
                columns={[
                  { key: "date", header: "Date", render: (row) => new Date(row.date).toLocaleDateString("fr-FR") },
                  { key: "operation", header: "Opération", render: (row) => row.label },
                  { key: "amount", header: "Montant", render: (row) => formatCurrency(row.amount) },
                  { key: "status", header: "Statut", render: (row) => row.status },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Actions rapides" subtitle="Parcours opérationnels instantanés">
              <QuickActions
                actions={[
                  { label: "Prendre RDV avec mon conseiller", onClick: () => setRequestModal("appointment") },
                  { label: "Déclarer un sinistre", tone: "secondary", onClick: () => setRequestModal("claim") },
                ]}
              />
            </SectionBlock>
          </>
        ) : (
          <>
            <MetricsGrid
              items={[
                { label: "Clients suivis", value: String(managerRows.length), detail: "Portefeuille actif" },
                {
                  label: "Encours géré",
                  value: "À connecter",
                  detail: "Donnée back-office non branchée",
                },
                {
                  label: "KYC à vérifier",
                  value: String(managerRows.filter((row) => row.kycStatus === "A verifier").length),
                  detail: "Conformité documentaire",
                },
              ]}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            />

            <SectionBlock
              title="Portefeuille clients"
              subtitle="Encours, risque et conformité KYC"
              actions={
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
              }
            >
              <DataTable
                rows={managerRows}
                emptyText="Aucun client disponible."
                minWidthClassName="min-w-[940px]"
                columns={[
                  { key: "name", header: "Nom du client", render: (row) => row.fullName },
                  { key: "aum", header: "Encours géré", render: (row) => (row.assetsUnderManagement === null ? "À connecter" : formatCurrency(row.assetsUnderManagement)) },
                  { key: "risk", header: "Profil de risque", render: (row) => row.riskProfile },
                  { key: "kyc", header: "Statut conformité (KYC)", render: (row) => row.kycStatus },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Actions gestionnaire" subtitle="Pilotage de la performance et du risque client">
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
        service="assurance"
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
