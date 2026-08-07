"use client";

import AdminSettingsPage from "@/app/admin/parametres/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function DirectionSettingsPage() {
  return (
    <ModulePermissionGuard permission="page:admin.settings">
      <AdminSettingsPage moduleView="all" />
    </ModulePermissionGuard>
  );
}
