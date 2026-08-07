"use client";

import LawFirmWorkspacePage from "@/app/cabinet/espace/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function LawLibraryPage() {
  return (
    <ModulePermissionGuard permission="space:law_firm">
      <LawFirmWorkspacePage moduleView="library" />
    </ModulePermissionGuard>
  );
}
