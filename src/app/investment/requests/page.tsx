"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function InvestmentRequestsPage() {
  return (
    <ModulePermissionGuard permission="space:investment">
      <InternalModulePlaceholder title="Demandes" subtitle="Investment" note="Demandes de rendez-vous et arbitrage vers une page dédiée partageable." />
    </ModulePermissionGuard>
  );
}
