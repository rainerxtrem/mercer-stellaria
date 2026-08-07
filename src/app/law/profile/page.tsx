"use client";

import LawFirmWorkspacePage from "@/app/cabinet/espace/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function LawProfilePage() {
  return (
    <ModulePermissionGuard permission="space:law_firm">
      <LawFirmWorkspacePage moduleView="profile" />
    </ModulePermissionGuard>
  );
}
