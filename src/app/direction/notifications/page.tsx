"use client";

import AdminPage from "@/app/admin/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function DirectionNotificationsPage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <AdminPage moduleView="notifications" />
    </ModulePermissionGuard>
  );
}
