"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function AssuranceContractsPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <InternalModulePlaceholder title="Contrats" subtitle="Assurance" note="Les fonctionnalités contrat sont accessibles depuis le tableau de bord et seront migrées ici de manière incrémentale." />
    </ModulePermissionGuard>
  );
}
