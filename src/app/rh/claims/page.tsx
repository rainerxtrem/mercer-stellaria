"use client";

import CollaborateurPage from "@/app/collaborateur/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function RhClaimsPage() {
  return (
    <ModulePermissionGuard permission="space:collaborateur">
      <CollaborateurPage forcedTab="CLAIMS" hideTabNavigation />
    </ModulePermissionGuard>
  );
}
