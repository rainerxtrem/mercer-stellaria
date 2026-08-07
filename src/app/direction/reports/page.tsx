"use client";

import AdminPage from "@/app/admin/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function DirectionReportsPage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <AdminPage moduleView="reports" />
    </ModulePermissionGuard>
  );
}
