"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function AssuranceBillingPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <InternalModulePlaceholder title="Facturation" subtitle="Assurance" note="La facturation assurance est accessible depuis le dashboard actuel, migration dédiée en cours." />
    </ModulePermissionGuard>
  );
}
