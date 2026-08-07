"use client";

import AdminSettingsPage from "@/app/admin/parametres/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function DirectionPermissionsPage() {
  return (
    <ModulePermissionGuard permission="module:settings.permissions">
      <AdminSettingsPage moduleView="permissions" />
    </ModulePermissionGuard>
  );
}
