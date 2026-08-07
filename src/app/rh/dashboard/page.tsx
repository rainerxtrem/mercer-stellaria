"use client";

import CollaborateurPage from "@/app/collaborateur/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function RhDashboardPage() {
  return (
    <ModulePermissionGuard permission="space:collaborateur">
      <CollaborateurPage />
    </ModulePermissionGuard>
  );
}
