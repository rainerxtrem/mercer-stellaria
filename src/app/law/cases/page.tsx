"use client";

import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";

type Matter = {
  id: string;
  matterNumber: string;
  title: string;
  summary: string | null;
  status: "IN_PROGRESS" | "PENDING" | "HOLD" | "CLOSED";
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  client: { id: string; fullName: string; email: string; phone: string | null };
  participants?: Array<{ client: { id: string; fullName: string; email: string } }>;
  createdBy?: { fullName: string };
  updatedBy?: { fullName: string };
  tasks?: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
  messages?: Array<{ id: string; body: string; senderName: string; createdAt: string }>;
  documents?: Array<{ id: string; title: string; documentNumber: string; createdAt: string }>;
  priority?: "URGENT" | "HIGH" | "STANDARD";
  type?: string;
  assignee?: string;
  dueDate?: string | null;
};

type ClientOption = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

type MatterFormState = {
  title: string;
  summary: string;
  clientIds: string[];
  type: string;
  priority: "URGENT" | "HIGH" | "STANDARD";
  assignee: string;
  dueDate: string;
};

const statusMeta: Record<Matter["status"], { label: string; tone: string }> = {
  IN_PROGRESS: { label: "En cours", tone: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  PENDING: { label: "En attente", tone: "bg-amber-100 text-amber-700 border-amber-200" },
  HOLD: { label: "En instance", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  CLOSED: { label: "Clôturé", tone: "bg-violet-100 text-violet-700 border-violet-200" },
};

const priorityMeta: Record<NonNullable<Matter["priority"]>, { label: string; tone: string }> = {
  URGENT: { label: "Urgent", tone: "bg-rose-100 text-rose-700 border-rose-200" },
  HIGH: { label: "Élevée", tone: "bg-orange-100 text-orange-700 border-orange-200" },
  STANDARD: { label: "Standard", tone: "bg-sky-100 text-sky-700 border-sky-200" },
};

function derivePriority(matter: Matter) {
  if (matter.priority) return matter.priority;
  if (matter.status === "HOLD") return "URGENT";
  if ((matter.tasks ?? []).some((task) => task.status !== "DONE" && task.dueDate && new Date(task.dueDate) < new Date())) return "URGENT";
  if ((matter.tasks ?? []).some((task) => task.status === "IN_PROGRESS" || task.status === "BLOCKED")) return "HIGH";
  return "STANDARD";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function LawCasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matters, setMatters] = useState<Matter[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL");
  const [archivedFilter, setArchivedFilter] = useState(searchParams.get("archived") ?? "0");
  const [sortMode, setSortMode] = useState(searchParams.get("sort") ?? "recent");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [form, setForm] = useState<MatterFormState>({
    title: "",
    summary: "",
    clientIds: [],
    type: "Mandat",
    priority: "STANDARD",
    assignee: "",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    const [mattersRes, clientsRes] = await Promise.all([fetch(`/api/law-firm/matters?archived=${archivedFilter}`), fetch("/api/law-firm/clients")]);

    if (mattersRes.ok) {
      const data = (await mattersRes.json()).data ?? [];
      setMatters(data as Matter[]);
    }
    if (clientsRes.ok) {
      const data = (await clientsRes.json()).data ?? [];
      setClients(data as ClientOption[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [archivedFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (archivedFilter !== "0") params.set("archived", archivedFilter);
    if (sortMode !== "recent") params.set("sort", sortMode);
    const nextUrl = `/law/cases${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [searchTerm, statusFilter, archivedFilter, sortMode, router]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, archivedFilter, sortMode]);

  const filteredMatters = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const next = matters.filter((matter) => {
      if (statusFilter !== "ALL" && matter.status !== statusFilter) return false;
      if (!keyword) return true;
      const haystack = `${matter.matterNumber} ${matter.title} ${matter.client.fullName} ${matter.client.email} ${(matter.participants ?? []).map((entry) => entry.client.fullName).join(" ")}`.toLowerCase();
      return haystack.includes(keyword);
    });

    return [...next].sort((a, b) => {
      if (sortMode === "alpha") return a.title.localeCompare(b.title);
      if (sortMode === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }, [matters, searchTerm, statusFilter, sortMode]);

  const visibleMatters = useMemo(() => filteredMatters.slice(0, page * 8), [filteredMatters, page]);
  const hasMore = visibleMatters.length < filteredMatters.length;

  const clientOptions = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    return clients.filter((client) => !query || `${client.fullName} ${client.email}`.toLowerCase().includes(query));
  }, [clients, clientQuery]);

  async function handleCreateMatter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || form.clientIds.length === 0) return;

    setSubmitting(true);
    const response = await fetch("/api/law-firm/matters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        clientIds: form.clientIds,
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const createdMatter = payload.data as Matter;
    setMatters((prev) => [
      {
        ...createdMatter,
        priority: form.priority,
        type: form.type,
        dueDate: form.dueDate || null,
        assignee: form.assignee || "Équipe",
      },
      ...prev,
    ]);
    setModalOpen(false);
    setForm({ title: "", summary: "", clientIds: [], type: "Mandat", priority: "STANDARD", assignee: "", dueDate: "" });
    setClientQuery("");
  }

  function toggleClient(clientId: string) {
    setForm((prev) => ({
      ...prev,
      clientIds: prev.clientIds.includes(clientId) ? prev.clientIds.filter((value) => value !== clientId) : [...prev.clientIds, clientId],
    }));
  }

  function openMatter(matter: Matter) {
    const saved = window.scrollY;
    window.sessionStorage.setItem("law-cases-scroll", String(saved));
    router.push(`/law/cases/${matter.id}`);
  }

  useEffect(() => {
    const saved = window.sessionStorage.getItem("law-cases-scroll");
    if (saved) {
      window.scrollTo({ top: Number(saved), behavior: "auto" });
      window.sessionStorage.removeItem("law-cases-scroll");
    }
  }, []);

  return (
    <ModulePermissionGuard permission="module:law_firm.cases">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.04),_transparent_35%)] px-4 py-4 text-slate-800 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Law Firm</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Gestion des dossiers</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">Une interface claire et fluide pour créer, suivre et consulter vos dossiers à partir d’un espace de travail premium.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5">
                + Nouveau dossier
              </button>
            </div>
          </header>

          <section className="rounded-[28px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)] backdrop-blur lg:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 md:flex-row">
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher un dossier, un client ou un numéro..." className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-0" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <option value="ALL">Tous les statuts</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="PENDING">En attente</option>
                  <option value="HOLD">En instance</option>
                  <option value="CLOSED">Clôturé</option>
                </select>
                <select value={archivedFilter} onChange={(event) => setArchivedFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <option value="0">Actifs</option>
                  <option value="1">Archivés</option>
                  <option value="2">Tous</option>
                </select>
              </div>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <option value="recent">Plus récents</option>
                <option value="created">Créés récemment</option>
                <option value="alpha">Alphabétique</option>
              </select>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Numéro</th>
                    <th className="px-4 py-3">Titre</th>
                    <th className="px-4 py-3">Client(s)</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Priorité</th>
                    <th className="px-4 py-3">Dernière activité</th>
                    <th className="px-4 py-3">Créé le</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">Chargement des dossiers...</td>
                    </tr>
                  ) : visibleMatters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">Aucun dossier ne correspond aux filtres actuels.</td>
                    </tr>
                  ) : (
                    visibleMatters.map((matter) => {
                      const status = statusMeta[matter.status];
                      const priority = priorityMeta[derivePriority(matter)];
                      return (
                        <tr key={matter.id} className="transition hover:bg-slate-50">
                          <td className="px-4 py-4 font-semibold text-slate-900">{matter.matterNumber}</td>
                          <td className="px-4 py-4">
                            <button type="button" onClick={() => openMatter(matter)} className="text-left font-semibold text-slate-900 transition hover:text-slate-600">
                              {matter.title}
                            </button>
                            <p className="mt-1 text-xs text-slate-500">{matter.summary ?? "Résumé à compléter"}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{[matter.client.fullName, ...(matter.participants ?? []).map((entry) => entry.client.fullName)].join(", ")}</td>
                          <td className="px-4 py-4 text-slate-600">{matter.createdBy?.fullName ?? matter.client.fullName}</td>
                          <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span></td>
                          <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.tone}`}>{priority.label}</span></td>
                          <td className="px-4 py-4 text-slate-600">{formatDateTime(matter.lastActivityAt)}</td>
                          <td className="px-4 py-4 text-slate-600">{formatDate(matter.createdAt)}</td>
                          <td className="px-4 py-4">
                            <button type="button" onClick={() => openMatter(matter)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                              Ouvrir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {hasMore ? (
              <div className="border-t border-slate-200 px-4 py-4 text-center">
                <button type="button" onClick={() => setPage((prev) => prev + 1)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Charger plus
                </button>
              </div>
            ) : null}
          </section>
        </div>

        {modalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
            <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Nouveau dossier</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Créer un nouveau dossier</h2>
                </div>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600">Fermer</button>
              </div>

              <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleCreateMatter}>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Titre du dossier</label>
                  <input required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Titre du dossier" />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Client(s)</label>
                  <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Rechercher un client" className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
                  <div className="max-h-44 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {clientOptions.length === 0 ? <p className="text-sm text-slate-500">Aucun client trouvé.</p> : clientOptions.map((client) => (
                      <label key={client.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-sm hover:border-slate-200 hover:bg-white">
                        <input type="checkbox" checked={form.clientIds.includes(client.id)} onChange={() => toggleClient(client.id)} />
                        <span>{client.fullName} · {client.email}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Type</label>
                  <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <option value="Mandat">Mandat</option>
                    <option value="Contentieux">Contentieux</option>
                    <option value="Pré-contentieux">Pré-contentieux</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Priorité</label>
                  <select value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as MatterFormState["priority"] }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <option value="STANDARD">Standard</option>
                    <option value="HIGH">Élevée</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Responsable</label>
                  <input value={form.assignee} onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Nom du responsable" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Échéance</label>
                  <input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                  <textarea value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Résumé du dossier, objectifs et contexte" />
                </div>

                <div className="md:col-span-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Annuler</button>
                  <button type="submit" disabled={submitting} className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{submitting ? "Création..." : "Créer le dossier"}</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </ModulePermissionGuard>
  );
}

export default function LawCasesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-700 lg:px-8"><div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">Chargement des dossiers...</div></div>}>
      <LawCasesContent />
    </Suspense>
  );
}
