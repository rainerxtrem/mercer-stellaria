"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function FinanceProfilePage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <InternalModulePlaceholder title="Mon espace" subtitle="Finance" note="Profil du responsable finance et paramètres du module." />
    </ModulePermissionGuard>
  );
}
