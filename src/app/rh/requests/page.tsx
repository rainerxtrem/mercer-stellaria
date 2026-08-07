"use client";

import CollaborateurPage from "@/app/collaborateur/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function RhRequestsPage() {
  return (
    <ModulePermissionGuard permission="space:collaborateur">
      <CollaborateurPage forcedTab="REQUESTS" hideTabNavigation />
    </ModulePermissionGuard>
  );
}
