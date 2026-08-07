"use client";

import CollaborateurPage from "@/app/collaborateur/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function RhContactPage() {
  return (
    <ModulePermissionGuard permission="space:collaborateur">
      <CollaborateurPage forcedTab="CONTACT" hideTabNavigation />
    </ModulePermissionGuard>
  );
}
