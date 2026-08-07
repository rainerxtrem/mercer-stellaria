"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function FinanceTreasuryPage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <InternalModulePlaceholder title="Trésorerie" subtitle="Finance" note="Suivi de trésorerie et flux de paiement sur une page dédiée." />
    </ModulePermissionGuard>
  );
}
