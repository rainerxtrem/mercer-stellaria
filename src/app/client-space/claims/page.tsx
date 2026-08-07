"use client";

import ClientPage from "@/app/client/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function ClientClaimsPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <ClientPage forcedTab="CLAIMS" hideTabNavigation />
    </ModulePermissionGuard>
  );
}
