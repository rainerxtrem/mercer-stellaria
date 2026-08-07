"use client";

import AssurancesDashboardPage from "@/app/assurances/dashboard/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function AssuranceDashboardPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <AssurancesDashboardPage />
    </ModulePermissionGuard>
  );
}
