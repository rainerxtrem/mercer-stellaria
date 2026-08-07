"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function AssuranceClaimsPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <InternalModulePlaceholder title="Sinistres" subtitle="Assurance" note="Le traitement sinistre est disponible depuis le tableau de bord et sera déplacé vers ce module dédié." />
    </ModulePermissionGuard>
  );
}
