"use client";

import { useSession } from "next-auth/react";
import { SectionBlock } from "@/components/dashboard/section-block";
import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";

function DirectionProfileContent() {
  const { data: session } = useSession();

  return (
    <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-4 lg:px-8 lg:py-6">
      <SectionBlock title="Mon espace" subtitle="Profil Direction">
        <div className="grid gap-2 text-sm text-ms-ink/80">
          <p>Nom: {session?.user?.name ?? "Non renseigné"}</p>
          <p>Email: {session?.user?.email ?? "Non renseigné"}</p>
          <p>Rôle: {session?.user?.role ?? "Non renseigné"}</p>
        </div>
      </SectionBlock>
    </main>
  );
}

export default function DirectionProfilePage() {
  return (
    <ModulePermissionGuard permission="space:direction">
      <DirectionProfileContent />
    </ModulePermissionGuard>
  );
}
