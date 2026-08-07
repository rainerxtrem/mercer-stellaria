"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function FinanceBillingPage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <InternalModulePlaceholder title="Facturation" subtitle="Finance" note="Module facturation finance dédié par URL." />
    </ModulePermissionGuard>
  );
}
