"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function InvestmentPortfolioPage() {
  return (
    <ModulePermissionGuard permission="space:investment">
      <InternalModulePlaceholder title="Portefeuille" subtitle="Investment" note="Le détail portefeuille est exposé dans le dashboard actuel et migre vers cette page dédiée." />
    </ModulePermissionGuard>
  );
}
