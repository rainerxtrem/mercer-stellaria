"use client";

import { SectionBlock } from "@/components/dashboard/section-block";
import { StatCard } from "@/components/dashboard/stat-card";
import { DocumentTemplateManager } from "@/components/admin/document-template-manager";
import { WorkspaceSidebar } from "@/components/navigation/workspace-sidebar";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type KpiData = {
  revenue: number;
  activeContracts: number;
  clients: number;
  claims: number;
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

type AppNotification = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  actorRole: string | null;
  actor: { id: string; fullName: string; email: string } | null;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const isOwner = Boolean(session?.user?.isOwner);
  const [status, setStatus] = useState<string>("");
  const [kpis, setKpis] = useState<KpiData>({ revenue: 0, activeContracts: 0, clients: 0, claims: 0 });
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [notificationFeed, setNotificationFeed] = useState<AppNotification[]>([]);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);
  const [auditTrail, setAuditTrail] = useState<AuditItem[]>([]);
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
    const [kpiRes, claimsRes, contractsRes, notificationsRes, auditRes] = await Promise.all([
      fetch("/api/admin/kpis"),
      fetch("/api/claims"),
      fetch("/api/contracts"),
      fetch("/api/notifications"),
      fetch("/api/admin/audit"),
    ]);

    if (kpiRes.ok) {
      const json = await kpiRes.json();
      setKpis(json.data);
    }

    if (claimsRes.ok) {
      const json = await claimsRes.json();
      setClaims(json.data ?? []);
    }

    if (contractsRes.ok) {
      const json = await contractsRes.json();
      setContracts(json.data ?? []);
    }

    if (notificationsRes.ok) {
      const json = await notificationsRes.json();
      setNotificationFeed(Array.isArray(json?.data?.notifications) ? json.data.notifications : []);
      setFeedUnreadCount(Number(json?.data?.feedUnreadCount ?? 0));
    }

    if (auditRes.ok) {
      const json = await auditRes.json();
      setAuditTrail(json.data ?? []);
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

  async function markNotificationsAsRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });

    if (!response.ok) {
      setStatus("Impossible de marquer les notifications comme lues.");
      return;
    }

    setNotificationFeed((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setFeedUnreadCount(0);
    setStatus("Notifications marquées comme lues.");
  }

  return (
    <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
      <WorkspaceSidebar space="admin" currentPath="/admin" />
      <div className="workspace-grid mx-auto grid w-full max-w-7xl gap-6 lg:pl-[19rem]">
        {status ? (
          <div className="fixed right-5 top-5 z-[80] w-full max-w-sm" aria-live="polite">
            <div className="rounded-xl border border-ms-navy/15 bg-white/95 px-4 py-3 text-sm font-semibold text-ms-navy shadow-lg backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <p>{status}</p>
                <button
                  type="button"
                  aria-label="Fermer la notification"
                  className="rounded-md px-1 py-0.5 text-xs font-bold opacity-70 hover:opacity-100"
                  onClick={() => setStatus("")}
                >
                  x
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <header className="workspace-hero">
          <p className="workspace-kicker">Espace Administrateur</p>
          <h1 className="workspace-title">Direction & Supervision</h1>
          <p className="workspace-subtitle">KPI globaux, pilotage des collaborateurs et validation des sinistres majeurs.</p>
          <a
            href="/admin/parametres"
            className="mt-4 inline-flex w-fit items-center rounded-full border border-ms-navy/25 bg-white px-4 py-2 text-sm font-semibold text-ms-navy transition hover:bg-ms-cream/50"
          >
            Ouvrir Paramètres
          </a>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Chiffre d'affaires" value={`${kpis.revenue.toLocaleString("fr-FR")} $`} />
          <StatCard label="Contrats actifs" value={String(kpis.activeContracts)} />
          <StatCard label="Clients" value={String(kpis.clients)} />
          <StatCard label="Sinistres déclarés" value={String(kpis.claims)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
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

        <section className="grid gap-6 lg:grid-cols-2">
          <SectionBlock
            title="Centre notifications"
            subtitle="Alertes opérationnelles et suivi quotidien"
            actions={
              <button
                type="button"
                className="rounded-full border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                onClick={() => void markNotificationsAsRead()}
              >
                Tout marquer lu ({feedUnreadCount})
              </button>
            }
          >
            <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-white p-3">
              {notificationFeed.length === 0 ? (
                <p className="text-sm text-ms-ink/65">Aucune notification disponible.</p>
              ) : (
                notificationFeed.slice(0, 10).map((item) => (
                  <article key={item.id} className={`rounded-lg border p-3 ${item.isRead ? "border-ms-navy/10 bg-ms-cream/40" : "border-ms-gold/35 bg-ms-gold/10"}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">{item.title}</p>
                    <p className="mt-1 text-sm text-ms-ink/85">{item.body}</p>
                    <p className="mt-1 text-xs text-ms-ink/60">{new Date(item.createdAt).toLocaleString("fr-FR")}</p>
                  </article>
                ))
              )}
            </div>
          </SectionBlock>

          <SectionBlock title="Journal d&apos;audit" subtitle="Traçabilité des actions sensibles">
            <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-white p-3">
              {auditTrail.length === 0 ? (
                <p className="text-sm text-ms-ink/65">Aucune entrée d&apos;audit.</p>
              ) : (
                auditTrail.slice(0, 15).map((item) => (
                  <article key={item.id} className="rounded-lg border border-ms-navy/10 bg-ms-cream/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">{item.action}</p>
                    <p className="mt-1 text-sm text-ms-ink/85">{item.summary}</p>
                    <p className="mt-1 text-xs text-ms-ink/60">
                      {new Date(item.createdAt).toLocaleString("fr-FR")} · {item.actor?.fullName ?? "Système"}
                    </p>
                  </article>
                ))
              )}
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

              <div className="space-y-3 md:hidden">
                {accessUsers.map((user) => (
                  <article key={user.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                    <p className="text-sm font-semibold text-ms-navy">{user.fullName}</p>
                    <p className="mt-1 text-xs text-ms-ink/70">{user.email}</p>
                    <div className="mt-3 grid gap-1 text-sm text-ms-ink/80">
                      <p>Discord: {user.discordHandle ?? "-"}</p>
                      <p>Rôle: {user.role}</p>
                      <p>Statut: {user.isActive ? "Actif" : "Désactivé"}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
          <div className="space-y-3 md:hidden">
            {performance.map((agent) => (
              <article key={agent.name} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                <p className="text-sm font-semibold text-ms-navy">{agent.name}</p>
                <div className="mt-3 grid gap-1 text-sm text-ms-ink/80">
                  <p>Contrats signés: {agent.signedContracts}</p>
                  <p>Taux de conversion: {agent.conversionRate}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
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

        <DocumentTemplateManager onStatus={setStatus} />
      </div>
    </main>
  );
}
