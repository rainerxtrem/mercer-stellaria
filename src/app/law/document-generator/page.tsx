"use client";

import LawFirmWorkspacePage from "@/app/cabinet/espace/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function LawDocumentGeneratorPage() {
  return (
    <ModulePermissionGuard permission="module:law_firm.documents">
      <LawFirmWorkspacePage moduleView="document-generator" />
    </ModulePermissionGuard>
  );
}
