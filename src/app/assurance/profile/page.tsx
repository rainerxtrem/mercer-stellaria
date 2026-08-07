"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function AssuranceProfilePage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <InternalModulePlaceholder title="Mon espace" subtitle="Assurance" note="Profil et préférences utilisateur assurance." />
    </ModulePermissionGuard>
  );
}
