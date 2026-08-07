"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function FinanceReportsPage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <InternalModulePlaceholder title="Rapports" subtitle="Finance" note="Rapports financiers exportables et partageables via URL." />
    </ModulePermissionGuard>
  );
}
