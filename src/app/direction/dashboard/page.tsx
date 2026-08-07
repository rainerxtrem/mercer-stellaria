"use client";

import AdminPage from "@/app/admin/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function DirectionDashboardPage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <AdminPage moduleView="dashboard" />
    </ModulePermissionGuard>
  );
}
