"use client";

import LawFirmWorkspacePage from "@/app/cabinet/espace/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function LawTasksPage() {
  return (
    <ModulePermissionGuard permission="module:law_firm.tasks">
      <LawFirmWorkspacePage moduleView="tasks" />
    </ModulePermissionGuard>
  );
}
