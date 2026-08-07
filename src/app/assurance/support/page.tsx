"use client";

import { InternalModulePlaceholder } from "@/components/navigation/internal-module-placeholder";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function AssuranceSupportPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <InternalModulePlaceholder title="Support" subtitle="Assurance" note="Le centre support devient une page dédiée partageable par URL." />
    </ModulePermissionGuard>
  );
}
