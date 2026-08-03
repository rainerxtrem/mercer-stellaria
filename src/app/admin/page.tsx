"use client";

import { SectionBlock } from "@/components/dashboard/section-block";
import { StatCard } from "@/components/dashboard/stat-card";
import { RoleSwitcher } from "@/components/navigation/role-switcher";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type KpiData = {
  revenue: number;
  activeContracts: number;
  clients: number;
  claims: number;
};

type Collaborator = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
};

type Claim = {
  id: string;
  claimNumber: string;
  requestedAmount: string | number | null;
  status: string;
  client: { fullName: string };
};

type Contract = {
  id: string;
  status: string;
  agent: { fullName: string };
};

type AccessUser = {
  id: string;
  fullName: string;
  email: string;
  role: "CLIENT" | "COLLABORATOR" | "ADMIN";
  isActive: boolean;
  discordHandle: string | null;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const isOwner = Boolean(session?.user?.isOwner);
  const [status, setStatus] = useState<string>("");
  const [kpis, setKpis] = useState<KpiData>({ revenue: 0, activeContracts: 0, clients: 0, claims: 0 });
  const [team, setTeam] = useState<Collaborator[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [teamForm, setTeamForm] = useState({ userId: "", fullName: "", email: "" });
  const [accessForm, setAccessForm] = useState({ userId: "", role: "COLLABORATOR" as AccessUser["role"], isActive: true });

  const performance = useMemo(() => {
    const byAgent = new Map<string, number>();
    contracts.forEach((contract) => {
      if (contract.status === "ACTIVE") {
        const name = contract.agent?.fullName ?? "Inconnu";
        byAgent.set(name, (byAgent.get(name) ?? 0) + 1);
      }
    });

    const total = contracts.length || 1;
    return [...byAgent.entries()].map(([name, signedContracts]) => ({
      name,
      signedContracts,
      conversionRate: `${Math.round((signedContracts / total) * 100)}%`,
    }));
  }, [contracts]);

  async function loadData() {
    const [kpiRes, teamRes, claimsRes, contractsRes] = await Promise.all([
      fetch("/api/admin/kpis"),
      fetch("/api/admin/team"),
      fetch("/api/claims"),
      fetch("/api/contracts"),
    ]);

    if (kpiRes.ok) {
      const json = await kpiRes.json();
      setKpis(json.data);
    }

    if (teamRes.ok) {
      const json = await teamRes.json();
      setTeam(json.data ?? []);
    }

    if (claimsRes.ok) {
      const json = await claimsRes.json();
      setClaims(json.data ?? []);
    }

    if (contractsRes.ok) {
      const json = await contractsRes.json();
      setContracts(json.data ?? []);
    }

    if (isOwner) {
      const accessRes = await fetch("/api/admin/access");
      if (accessRes.ok) {
        const json = await accessRes.json();
        setAccessUsers(json.data ?? []);
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch(() => setStatus("Erreur de chargement des données."));
  }, [isOwner]);

  async function createTeamMember() {
    const response = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: teamForm.fullName, email: teamForm.email }),
    });

    if (!response.ok) {
      setStatus("Création collaborateur impossible.");
      return;
    }

    setStatus("Collaborateur cree.");
    await loadData();
  }

  async function updateTeamMember() {
    if (!teamForm.userId) {
      setStatus("Sélectionnez un collaborateur à modifier.");
      return;
    }

    const response = await fetch("/api/admin/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: teamForm.userId, fullName: teamForm.fullName, email: teamForm.email }),
    });

    if (!response.ok) {
      setStatus("Modification collaborateur impossible.");
      return;
    }

    setStatus("Collaborateur modifié.");
    await loadData();
  }

  async function deleteTeamMember() {
    if (!teamForm.userId) {
      setStatus("Sélectionnez un collaborateur à supprimer.");
      return;
    }

    const response = await fetch("/api/admin/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: teamForm.userId }),
    });

    if (!response.ok) {
      setStatus("Suppression collaborateur impossible.");
      return;
    }

    setStatus("Collaborateur supprimé.");
    setTeamForm({ userId: "", fullName: "", email: "" });
    await loadData();
  }

  async function updateClaimStatus(claimId: string, statusValue: "APPROVED" | "WAITING_DETAILS") {
    const response = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, status: statusValue }),
    });

    if (!response.ok) {
      setStatus("Mise à jour du sinistre impossible.");
      return;
    }

    setStatus(statusValue === "APPROVED" ? "Sinistre validé." : "Compléments demandés.");
    await loadData();
  }

  async function updateUserAccess() {
    if (!accessForm.userId) {
      setStatus("Sélectionnez un utilisateur à mettre à jour.");
      return;
    }

    const response = await fetch("/api/admin/access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accessForm),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus(payload?.error ?? "Mise à jour des accès impossible.");
      return;
    }

    setStatus("Accès utilisateur mis à jour.");
    await loadData();
  }

  return (
    <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
      <div className="workspace-grid mx-auto grid w-full max-w-7xl gap-6">
        <RoleSwitcher currentPath="/admin" />
        <header className="workspace-hero">
          <p className="workspace-kicker">Espace Administrateur</p>
          <h1 className="workspace-title">Direction & Supervision</h1>
          <p className="workspace-subtitle">KPI globaux, pilotage des collaborateurs et validation des sinistres majeurs.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Chiffre d'affaires" value={`${kpis.revenue.toLocaleString("fr-FR")} $`} />
          <StatCard label="Contrats actifs" value={String(kpis.activeContracts)} />
          <StatCard label="Clients" value={String(kpis.clients)} />
          <StatCard label="Sinistres déclarés" value={String(kpis.claims)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SectionBlock title="Gestion de l'équipe" subtitle="Création et gestion des comptes collaborateurs">
            <form className="grid gap-3 text-sm">
              <select
                value={teamForm.userId}
                onChange={(event) => {
                  const selected = team.find((item) => item.id === event.target.value);
                  setTeamForm({
                    userId: event.target.value,
                    fullName: selected?.fullName ?? "",
                    email: selected?.email ?? "",
                  });
                }}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              >
                <option value="">Nouveau collaborateur</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
              <input
                placeholder="Nom collaborateur"
                value={teamForm.fullName}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, fullName: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <input
                placeholder="Email professionnel"
                value={teamForm.email}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={createTeamMember}
                  className="rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={updateTeamMember}
                  className="rounded-full border border-ms-navy/20 px-4 py-2.5 font-semibold text-ms-navy"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={deleteTeamMember}
                  className="rounded-full border border-red-300 px-4 py-2.5 font-semibold text-red-700"
                >
                  Supprimer
                </button>
              </div>
            </form>
          </SectionBlock>

          <SectionBlock title="Trésorerie & Sinistres" subtitle="Validation finale des remboursements lourds">
            <div className="space-y-3 text-sm">
              {claims.slice(0, 5).map((claim) => (
                <div key={claim.id} className="rounded-xl border border-ms-navy/10 bg-white p-4">
                  <p className="font-semibold text-ms-navy">{claim.claimNumber}</p>
                  <p className="text-ms-ink/75">
                    {claim.client.fullName} - montant demandé: {claim.requestedAmount ?? 0} $ ({claim.status})
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded-lg bg-ms-navy px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => updateClaimStatus(claim.id, "APPROVED")}
                    >
                      Valider
                    </button>
                    <button
                      className="rounded-lg border border-ms-navy/20 px-3 py-1.5 text-xs font-semibold text-ms-navy"
                      onClick={() => updateClaimStatus(claim.id, "WAITING_DETAILS")}
                    >
                      Demander compléments
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>
        </section>

        {isOwner ? (
          <SectionBlock title="Gestion admin" subtitle="Visible uniquement pour le compte proprietaire Discord baptiste_72">
            <div className="grid gap-3 text-sm">
              <select
                value={accessForm.userId}
                onChange={(event) => {
                  const selected = accessUsers.find((user) => user.id === event.target.value);
                  setAccessForm({
                    userId: event.target.value,
                    role: (selected?.role ?? "COLLABORATOR") as AccessUser["role"],
                    isActive: selected?.isActive ?? true,
                  });
                }}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              >
                <option value="">Sélectionner un utilisateur</option>
                {accessUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </option>
                ))}
              </select>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={accessForm.role}
                  onChange={(event) => setAccessForm((prev) => ({ ...prev, role: event.target.value as AccessUser["role"] }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                >
                  <option value="CLIENT">Client</option>
                  <option value="COLLABORATOR">Collaborateur</option>
                  <option value="ADMIN">Direction</option>
                </select>

                <select
                  value={accessForm.isActive ? "active" : "inactive"}
                  onChange={(event) => setAccessForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Désactivé</option>
                </select>
              </div>

              <button
                type="button"
                onClick={updateUserAccess}
                className="w-fit rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white"
              >
                Mettre à jour les accès
              </button>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-ms-navy-soft">
                    <tr>
                      <th className="pb-3">Utilisateur</th>
                      <th className="pb-3">Discord</th>
                      <th className="pb-3">Rôle</th>
                      <th className="pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="text-ms-ink/85">
                    {accessUsers.map((user) => (
                      <tr key={user.id} className="border-t border-ms-navy/10">
                        <td className="py-3">{user.fullName} ({user.email})</td>
                        <td className="py-3">{user.discordHandle ?? "-"}</td>
                        <td className="py-3">{user.role}</td>
                        <td className="py-3">{user.isActive ? "Actif" : "Désactivé"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionBlock>
        ) : null}

        <SectionBlock title="Performance par agent" subtitle="Qui a fait signer le plus de contrats ?">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-ms-navy-soft">
                <tr>
                  <th className="pb-3">Collaborateur</th>
                  <th className="pb-3">Contrats signés</th>
                  <th className="pb-3">Taux de conversion</th>
                </tr>
              </thead>
              <tbody className="text-ms-ink/85">
                {performance.map((agent) => (
                  <tr key={agent.name} className="border-t border-ms-navy/10">
                    <td className="py-3">{agent.name}</td>
                    <td className="py-3">{agent.signedContracts}</td>
                    <td className="py-3">{agent.conversionRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>

        {status ? <p className="surface px-4 py-3 text-sm font-medium text-ms-navy">{status}</p> : null}
      </div>
    </main>
  );
}
