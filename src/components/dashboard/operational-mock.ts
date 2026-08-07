import { AppRole } from "@/lib/rbac";

export type ServiceMode = "assurance" | "investment";

export type ClientPositionRow = {
  name: string;
  category: string;
  amount: number;
  performancePct: number;
};

export type ClientHistoryRow = {
  date: string;
  label: string;
  amount: number;
  status: "EXECUTEE" | "EN_COURS";
};

export type ManagerClientRow = {
  id: string;
  fullName: string;
  assetsUnderManagement: number | null;
  riskProfile: "Prudent" | "Equilibre" | "Dynamique";
  kycStatus: "A jour" | "A verifier";
};

export type OperationalDataset = {
  clientMetrics: Array<{ label: string; value: string; detail: string }>;
  positions: ClientPositionRow[];
  history: ClientHistoryRow[];
  managerClients: ManagerClientRow[];
};

export function buildEmptyOperationalDataset(service: ServiceMode, role: AppRole): OperationalDataset {
  if (service === "investment") {
    return {
      clientMetrics: [
        { label: "Total avoirs (€)", value: "0 €", detail: role === "CLIENT" ? "Aucun investissement en cours" : "À connecter aux encours réels" },
        { label: "Performance globale (%)", value: "0.00 %", detail: role === "CLIENT" ? "Aucun historique disponible" : "Calcul activable via l'API performance" },
        { label: "Capital investi (€)", value: "0 €", detail: role === "CLIENT" ? "Compte investisseur neuf" : "Source back-office à connecter" },
      ],
      positions: [],
      history: [],
      managerClients: [],
    };
  }

  return {
    clientMetrics: [
      { label: "Contrats actifs", value: "0", detail: "Aucun contrat actif" },
      { label: "Prime hebdomadaire", value: "0 $", detail: "Aucune cotisation en cours" },
      { label: "Sinistres ouverts", value: "0", detail: "Aucune demande en cours" },
    ],
    positions: [],
    history: [],
    managerClients: [],
  };
}
