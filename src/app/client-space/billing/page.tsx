"use client";

import ClientPage from "@/app/client/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function ClientBillingPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <ClientPage forcedTab="BILLING" hideTabNavigation />
    </ModulePermissionGuard>
  );
}
