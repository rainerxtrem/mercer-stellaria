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
  assetsUnderManagement: number;
  riskProfile: "Prudent" | "Equilibre" | "Dynamique";
  kycStatus: "A jour" | "A verifier";
};

export type OperationalDataset = {
  clientMetrics: Array<{ label: string; value: string; detail: string }>;
  positions: ClientPositionRow[];
  history: ClientHistoryRow[];
  managerClients: ManagerClientRow[];
};

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR")} €`;
}

function roleMultiplier(role: AppRole) {
  if (role === "ADMIN") {
    return 1.2;
  }

  if (role === "COLLABORATOR") {
    return 1.1;
  }

  return 1;
}

export function buildOperationalDataset(service: ServiceMode, role: AppRole): OperationalDataset {
  const multiplier = roleMultiplier(role);

  if (service === "investment") {
    const positions: ClientPositionRow[] = [
      { name: "MS Private Opportunities", category: "Private Equity", amount: Math.round(620000 * multiplier), performancePct: 8.7 },
      { name: "MS Global Yield", category: "Private Debt", amount: Math.round(310000 * multiplier), performancePct: 4.2 },
      { name: "MS Core Real Estate", category: "Real Estate", amount: Math.round(470000 * multiplier), performancePct: 6.1 },
    ];

    const history: ClientHistoryRow[] = [
      { date: "2026-08-01", label: "Souscription MS Core Real Estate", amount: 120000, status: "EXECUTEE" },
      { date: "2026-07-24", label: "Arbitrage vers MS Global Yield", amount: 50000, status: "EXECUTEE" },
      { date: "2026-07-15", label: "Retrait partiel", amount: -30000, status: "EN_COURS" },
    ];

    const totalAssets = positions.reduce((sum, row) => sum + row.amount, 0);
    const investedCapital = Math.round(1120000 * multiplier);
    const performance = investedCapital === 0 ? 0 : ((totalAssets - investedCapital) / investedCapital) * 100;

    return {
      clientMetrics: [
        { label: "Total avoirs (€)", value: formatCurrency(totalAssets), detail: "Valorisation en date du jour" },
        { label: "Performance globale (%)", value: `${performance.toFixed(2)} %`, detail: "Depuis l'origine" },
        { label: "Capital investi (€)", value: formatCurrency(investedCapital), detail: "Cumul des versements" },
      ],
      positions,
      history,
      managerClients: [],
    };
  }

  const positions: ClientPositionRow[] = [
    { name: "Contrat Santé Premium", category: "Santé", amount: Math.round(180000 * multiplier), performancePct: 0.9 },
    { name: "Protection Pro Elite", category: "Professionnel", amount: Math.round(240000 * multiplier), performancePct: 1.2 },
    { name: "Patrimoine Secure", category: "Patrimonial", amount: Math.round(150000 * multiplier), performancePct: 0.6 },
  ];

  const history: ClientHistoryRow[] = [
    { date: "2026-08-02", label: "Déclaration sinistre habitation", amount: -15000, status: "EN_COURS" },
    { date: "2026-07-29", label: "Paiement cotisation mensuelle", amount: -2800, status: "EXECUTEE" },
    { date: "2026-07-12", label: "Attestation émise", amount: 0, status: "EXECUTEE" },
  ];

  return {
    clientMetrics: [
      { label: "Total avoirs assurés (€)", value: formatCurrency(positions.reduce((sum, row) => sum + row.amount, 0)), detail: "Base garanties actives" },
      { label: "Performance globale (%)", value: "+1.05 %", detail: "Indice satisfaction et sinistralité" },
      { label: "Capital protégé (€)", value: formatCurrency(Math.round(520000 * multiplier)), detail: "Montants couverts déclarés" },
    ],
    positions,
    history,
    managerClients: [],
  };
}
