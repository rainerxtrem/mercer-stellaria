"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SectionBlock } from "@/components/dashboard/section-block";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DataTable } from "@/components/dashboard/data-table";
import { RoleModeSwitch } from "@/components/dashboard/role-mode-switch";
import { RoleSwitcher } from "@/components/navigation/role-switcher";
import { AppRole } from "@/lib/rbac";
import { buildOperationalDataset, ManagerClientRow } from "@/components/dashboard/operational-mock";

type AssuranceMode = "CLIENT" | "MANAGER";

type ClientApiRow = {
  id: string;
  fullName: string;
  riskLabel: string | null;
  citizenUniqueId: string | null;
};

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

export default function AssurancesDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const isManager = role === "COLLABORATOR" || role === "ADMIN";

  const [mode, setMode] = useState<AssuranceMode>("CLIENT");
  const [managerClients, setManagerClients] = useState<ManagerClientRow[]>([]);
  const [riskFilter, setRiskFilter] = useState<"ALL" | "Prudent" | "Equilibre" | "Dynamique">("ALL");
  const [activeModal, setActiveModal] = useState<null | "appointment" | "claim" | "report" | "risk">(null);

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

  const dataset = useMemo(() => buildOperationalDataset("assurance", role), [role]);

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
        const mapped: ManagerClientRow[] = rows.map((client, index) => ({
          id: client.id,
          fullName: client.fullName,
          assetsUnderManagement: 90000 + (index + 1) * 28000,
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
        <RoleSwitcher currentPath="/assurances/dashboard" />

        <header className="workspace-hero">
          <p className="workspace-kicker">Assurances</p>
          <h1 className="workspace-title">Dashboard Assurances</h1>
          <p className="workspace-subtitle">Vue assurée et vue gestionnaire alignées sur les rôles de session.</p>
        </header>

        <RoleModeSwitch mode={mode} onModeChange={setMode} canUseManagerMode={isManager} />

        {mode === "CLIENT" ? (
          <>
            <MetricsGrid items={dataset.clientMetrics} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />

            <SectionBlock title="Répartition des garanties" subtitle="Contrats, types d'actifs couverts et suivi de valeur">
              <DataTable
                rows={dataset.positions}
                emptyText="Aucune garantie active."
                columns={[
                  { key: "fund", header: "Nom de la couverture", render: (row) => row.name },
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

            <SectionBlock title="Historique des opérations" subtitle="Transactions et incidents récents">
              <DataTable
                rows={dataset.history}
                emptyText="Aucune opération récente."
                columns={[
                  { key: "date", header: "Date", render: (row) => new Date(row.date).toLocaleDateString("fr-FR") },
                  { key: "operation", header: "Opération", render: (row) => row.label },
                  { key: "amount", header: "Montant", render: (row) => formatCurrency(row.amount) },
                  { key: "status", header: "Statut", render: (row) => (row.status === "EXECUTEE" ? "Exécutée" : "En cours") },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Actions rapides" subtitle="Parcours opérationnels instantanés">
              <QuickActions
                actions={[
                  { label: "Prendre RDV avec mon conseiller", onClick: () => setActiveModal("appointment") },
                  { label: "Déclarer un sinistre", tone: "secondary", onClick: () => setActiveModal("claim") },
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
                  value: formatCurrency(managerRows.reduce((sum, row) => sum + row.assetsUnderManagement, 0)),
                  detail: "Montants assurés agrégés",
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
                  { key: "aum", header: "Encours géré", render: (row) => formatCurrency(row.assetsUnderManagement) },
                  { key: "risk", header: "Profil de risque", render: (row) => row.riskProfile },
                  { key: "kyc", header: "Statut conformité (KYC)", render: (row) => row.kycStatus },
                ]}
              />
            </SectionBlock>

            <SectionBlock title="Actions gestionnaire" subtitle="Pilotage de la performance et du risque client">
              <QuickActions
                actions={[
                  { label: "Générer un rapport de performance", onClick: () => setActiveModal("report") },
                  { label: "Mettre à jour le profil de risque", tone: "secondary", onClick: () => setActiveModal("risk") },
                ]}
              />
            </SectionBlock>
          </>
        )}
      </div>

      {activeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ms-navy/45 px-4">
          <div className="surface w-full max-w-lg p-6">
            <h3 className="font-display text-3xl text-ms-navy">Action en cours</h3>
            <p className="mt-2 text-sm text-ms-ink/80">
              {activeModal === "appointment" ? "Demande de rendez-vous prête à être transmise au conseiller." : null}
              {activeModal === "claim" ? "Ouverture du workflow de déclaration de sinistre en préparation." : null}
              {activeModal === "report" ? "Génération d'un rapport de performance lancée pour le portefeuille filtré." : null}
              {activeModal === "risk" ? "Mise à jour du profil de risque prête à être appliquée." : null}
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" className="rounded-full bg-ms-navy px-4 py-2 text-xs font-semibold text-white" onClick={() => setActiveModal(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
