"use client";

import LawFirmWorkspacePage from "@/app/cabinet/espace/page";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

export default function LawBillingPage() {
  return (
    <ModulePermissionGuard permission="module:law_firm.billing">
      <LawFirmWorkspacePage moduleView="billing" />
    </ModulePermissionGuard>
  );
}
