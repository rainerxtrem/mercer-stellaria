"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function InvestmentProfilePage() {
  return (
    <ModulePermissionGuard permission="space:investment">
      <InternalModulePlaceholder title="Mon espace" subtitle="Investment" note="Profil investisseur et préférences utilisateur." />
    </ModulePermissionGuard>
  );
}
