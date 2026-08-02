export const clientOverview = {
  activeContracts: 3,
  pendingSignatures: 1,
  weeklyContribution: 2350,
  lateInvoices: 1,
};

export const clientContracts = [
  {
    id: "CTR-2026-1104",
    formula: "Care Plus",
    status: "Actif",
    weeklyPremium: 850,
    coverage: "Hospitalisation, urgences, pharmacie",
  },
  {
    id: "CTR-2026-1147",
    formula: "Safe Home",
    status: "Signature requise",
    weeklyPremium: 650,
    coverage: "Vol, effraction, incendie",
  },
  {
    id: "CTR-2026-1082",
    formula: "Business Shield",
    status: "Actif",
    weeklyPremium: 850,
    coverage: "Responsabilite civile, pertes d'exploitation",
  },
];

export const invoices = [
  {
    id: "INV-2026-4201",
    dueDate: "04/08/2026",
    amount: 850,
    status: "Paye",
  },
  {
    id: "INV-2026-4208",
    dueDate: "11/08/2026",
    amount: 850,
    status: "En attente",
  },
  {
    id: "INV-2026-4214",
    dueDate: "18/08/2026",
    amount: 650,
    status: "En retard",
  },
];

export const adminKpis = {
  revenue: 287540,
  activeContracts: 241,
  clients: 129,
  claims: 17,
};

export const agentPerformance = [
  { name: "Ariane Bell", signedContracts: 42, conversionRate: "71%" },
  { name: "Julian Hayes", signedContracts: 36, conversionRate: "66%" },
  { name: "Nadia Moore", signedContracts: 29, conversionRate: "62%" },
];
