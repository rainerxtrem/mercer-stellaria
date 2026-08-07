"use client";

import LawFirmWorkspacePage from "@/app/cabinet/espace/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function LawClientsPage() {
  return (
    <ModulePermissionGuard permission="module:law_firm.cases">
      <LawFirmWorkspacePage moduleView="clients" />
    </ModulePermissionGuard>
  );
}
