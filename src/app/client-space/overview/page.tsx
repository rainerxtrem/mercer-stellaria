"use client";

import ClientPage from "@/app/client/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function ClientOverviewPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <ClientPage forcedTab="OVERVIEW" hideTabNavigation />
    </ModulePermissionGuard>
  );
}
