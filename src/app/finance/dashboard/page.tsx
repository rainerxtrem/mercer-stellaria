"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function FinanceDashboardPage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <InternalModulePlaceholder title="Finance Dashboard" subtitle="Finance" note="Espace finance modulaire prêt à accueillir KPI, budget et clôture mensuelle." />
    </ModulePermissionGuard>
  );
}
