"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function InvestmentAnalyticsPage() {
  return (
    <ModulePermissionGuard permission="space:investment">
      <InternalModulePlaceholder title="Analytique" subtitle="Investment" note="Les analyses de performance sont en cours d'extraction vers ce module dédié." />
    </ModulePermissionGuard>
  );
}
