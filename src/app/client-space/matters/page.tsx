import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";
import ClientPage from "@/app/client/page";

export default function ClientMattersPage() {
  return (
    <ModulePermissionGuard permission="space:client">
      <ClientPage forcedTab="MATTERS" hideTabNavigation />
    </ModulePermissionGuard>
  );
}
