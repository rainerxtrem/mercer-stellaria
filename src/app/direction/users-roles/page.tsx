"use client";

import AdminSettingsPage from "@/app/admin/parametres/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function DirectionUsersRolesPage() {
  return (
    <ModulePermissionGuard permission="module:settings.users_roles">
      <AdminSettingsPage moduleView="users_roles" />
    </ModulePermissionGuard>
  );
}
