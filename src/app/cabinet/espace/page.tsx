"use client";

import { DocumentTemplateManager } from "@/components/admin/document-template-manager";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { SectionBlock } from "@/components/dashboard/section-block";
import { RoleSwitcher } from "@/components/navigation/role-switcher";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type LawMatter = {
  id: string;
  matterNumber: string;
  title: string;
  summary: string | null;
  status: "IN_PROGRESS" | "PENDING" | "HOLD" | "CLOSED";
  isArchived: boolean;
  client: { id: string; fullName: string; email: string; phone: string | null };
};

type MatterMessage = {
  id: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
  documentLink: string | null;
  signatureLink: string | null;
};

type LawInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  dueDate: string | null;
  matter: { id: string; title: string; matterNumber: string };
  client: { id: string; fullName: string; email: string };
  lines: Array<{ id: string; description: string; quantity: number; unitPrice: number; discount: number; lineTotal: number }>;
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  dueDate: string | null;
  matter: { id: string; title: string; matterNumber: string };
  assignee: { id: string; fullName: string; email: string } | null;
};

type SearchResult = {
  users: Array<{ id: string; fullName: string; email: string; role: string }>;
  matters: Array<{ id: string; title: string; matterNumber: string; status: string; isArchived: boolean; client: { fullName: string; email: string } }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; total: number; matter: { title: string }; client: { fullName: string } }>;
  documents: Array<{ id: string; title: string; documentNumber: string; signedAt: string | null }>;
};

type DashboardData = {
  metrics: Record<string, number>;
  recentActivity: Array<{ kind: string; id: string; title: string; updatedAt: string }>;
};

export default function LawFirmWorkspacePage() {
  const router = useRouter();
  const { status } = useSession();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [matters, setMatters] = useState<LawMatter[]>([]);
  const [invoices, setInvoices] = useState<LawInvoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskForm, setTaskForm] = useState({ matterId: "", title: "", description: "", dueDate: "" });
  const [taskSaving, setTaskSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [matterMessages, setMatterMessages] = useState<MatterMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?service=law_firm");
    }
  }, [router, status]);

  async function loadWorkspace() {
    const [dashboardRes, mattersRes, invoicesRes, tasksRes] = await Promise.all([
      fetch("/api/law-firm/dashboard"),
      fetch("/api/law-firm/matters"),
      fetch("/api/law-firm/invoices"),
      fetch("/api/law-firm/tasks"),
    ]);

    if (dashboardRes.ok) {
      setDashboard((await dashboardRes.json()).data ?? null);
    }
    if (mattersRes.ok) {
      setMatters((await mattersRes.json()).data ?? []);
    }
    if (invoicesRes.ok) {
      setInvoices((await invoicesRes.json()).data ?? []);
    }
    if (tasksRes.ok) {
      setTasks((await tasksRes.json()).data ?? []);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      const timeout = window.setTimeout(() => {
        void loadWorkspace().catch(() => setStatusMessage("Erreur de chargement de l'espace Law Firm."));
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [status]);

  async function runSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const response = await fetch(`/api/law-firm/search?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      setSearchResults((await response.json()).data as SearchResult);
    }
  }

  const selectedMatter = useMemo(() => matters.find((matter) => matter.id === selectedMatterId) ?? null, [matters, selectedMatterId]);
  const selectedInvoice = useMemo(() => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null, [invoices, selectedInvoiceId]);

  async function loadMatterMessages(matterId: string) {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/law-firm/matters/${matterId}/messages`);
      if (!response.ok) {
        throw new Error("messages_error");
      }
      const payload = await response.json();
      setMatterMessages(payload.data ?? []);
    } catch {
      setStatusMessage("Impossible de charger les messages du dossier.");
    } finally {
      setMessagesLoading(false);
    }
  }

  async function selectMatter(matterId: string) {
    setSelectedMatterId(matterId);
    await loadMatterMessages(matterId);
  }

  async function createMatter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/law-firm/matters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: String(form.get("clientId")),
        title: String(form.get("title")),
        summary: String(form.get("summary") || "") || undefined,
      }),
    });

    setStatusMessage(response.ok ? "Dossier créé." : "Création de dossier impossible.");
    await loadWorkspace();
  }

  async function sendMessage() {
    if (!selectedMatterId || !messageBody.trim()) return;

    const response = await fetch(`/api/law-firm/matters/${selectedMatterId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: messageBody }),
    });

    if (response.ok) {
      setMessageBody("");
      await loadWorkspace();
      await loadMatterMessages(selectedMatterId);
    }
  }

  async function updateMatter(matterId: string, action: "rename" | "update" | "archive" | "restore" | "delete", payload?: { title?: string; summary?: string | null; status?: LawMatter["status"] }) {
    const response = await fetch("/api/law-firm/matters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matterId, action, ...payload }),
    });

    if (!response.ok) {
      setStatusMessage("Action dossier impossible.");
      return;
    }

    setStatusMessage(action === "archive" ? "Dossier archivé." : action === "restore" ? "Dossier restauré." : action === "delete" ? "Dossier supprimé." : "Dossier mis à jour.");

    if (action === "delete" && selectedMatterId === matterId) {
      setSelectedMatterId(null);
      setMatterMessages([]);
    }

    await loadWorkspace();
  }

  async function invoiceAction(invoiceId: string, action: "send" | "duplicate" | "archive") {
    const response = await fetch("/api/law-firm/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, action }),
    });

    const messages: Record<string, string> = {
      send: response.ok ? "Facture envoyée." : "Envoi impossible.",
      duplicate: response.ok ? "Facture dupliquée." : "Duplication impossible.",
      archive: response.ok ? "Facture archivée." : "Archivage impossible.",
    };
    setStatusMessage(messages[action]);

    if (response.ok) {
      await loadWorkspace();
    }
  }

  async function signInvoice(invoiceId: string) {
    const response = await fetch(`/api/law-firm/invoices/${invoiceId}/sign`, { method: "POST" });
    setStatusMessage(response.ok ? "Signature enregistrée." : "Signature impossible.");
    if (response.ok) {
      await loadWorkspace();
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskForm.matterId || !taskForm.title.trim()) {
      setStatusMessage("Renseignez au minimum le dossier et le titre de tâche.");
      return;
    }

    setTaskSaving(true);
    const response = await fetch("/api/law-firm/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matterId: taskForm.matterId,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        dueDate: taskForm.dueDate || undefined,
      }),
    });

    if (!response.ok) {
      setStatusMessage("Création de tâche impossible.");
      setTaskSaving(false);
      return;
    }

    setTaskForm({ matterId: "", title: "", description: "", dueDate: "" });
    setStatusMessage("Tâche créée.");
    await loadWorkspace();
    setTaskSaving(false);
  }

  async function updateTaskStatus(taskId: string, nextStatus: Task["status"]) {
    const response = await fetch("/api/law-firm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action: "update", status: nextStatus }),
    });

    setStatusMessage(response.ok ? "Tâche mise à jour." : "Mise à jour de tâche impossible.");
    if (response.ok) {
      await loadWorkspace();
    }
  }

  async function deleteTask(taskId: string) {
    const response = await fetch("/api/law-firm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action: "delete" }),
    });

    setStatusMessage(response.ok ? "Tâche supprimée." : "Suppression de tâche impossible.");
    if (response.ok) {
      await loadWorkspace();
    }
  }

  async function createShareLink(invoiceId: string) {
    const response = await fetch("/api/law-firm/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, action: "create_share_link" }),
    });

    if (!response.ok) {
      setStatusMessage("Génération du lien impossible.");
      return;
    }

    const payload = (await response.json()).data as { shareUrl: string; shareTokenExpiresAt: string };
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload.shareUrl);
      setStatusMessage(`Lien sécurisé copié (expire le ${new Date(payload.shareTokenExpiresAt).toLocaleDateString("fr-FR")}).`);
      return;
    }

    setStatusMessage(`Lien sécurisé généré: ${payload.shareUrl}`);
  }

  async function revokeShareLink(invoiceId: string) {
    const response = await fetch("/api/law-firm/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, action: "revoke_share_link" }),
    });

    setStatusMessage(response.ok ? "Lien sécurisé révoqué." : "Révocation impossible.");
  }

  const metrics = [
    { label: "Dossiers actifs", value: String(dashboard?.metrics.activeMatters ?? 0), detail: "En cours" },
    { label: "Dossiers en attente", value: String(dashboard?.metrics.pendingMatters ?? 0), detail: "À traiter" },
    { label: "Factures impayées", value: String(dashboard?.metrics.unpaidInvoices ?? 0), detail: "À encaisser" },
    { label: "Documents à signer", value: String(dashboard?.metrics.documentsToSign ?? 0), detail: "En attente de signature" },
  ];

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8">
        <p className="text-sm text-ms-ink/70">Chargement sécurisé de l&apos;espace Law Firm...</p>
      </main>
    );
  }

  return (
    <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-4 lg:px-8 lg:py-6">
      <div className="workspace-grid grid gap-4 lg:gap-6">
        <RoleSwitcher currentPath="/cabinet/espace" />

        <header className="workspace-hero">
          <p className="workspace-kicker">Law Firm</p>
          <h1 className="workspace-title">Espace de travail juridique</h1>
          <p className="workspace-subtitle">Dossiers, documents, facturation, chat et recherche unifiée pour les collaborateurs autorisés.</p>
        </header>

        {statusMessage ? <div className="rounded-2xl border border-ms-navy/15 bg-white px-4 py-3 text-sm font-semibold text-ms-navy">{statusMessage}</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricsGrid items={metrics} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" />
        </section>

        <SectionBlock title="Recherche globale" subtitle="Clients, dossiers, documents, factures et avocats">
          <input value={searchQuery} onChange={(event) => void runSearch(event.target.value)} placeholder="Rechercher un nom, dossier, facture, document..." className="w-full rounded-2xl border border-ms-navy/15 bg-white px-4 py-3 text-sm" />
          {searchResults ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-4">
              <div><h3 className="mb-2 text-sm font-semibold text-ms-navy">Clients</h3>{searchResults.users.map((user) => <p key={user.id} className="text-sm">{user.fullName} - {user.email}</p>)}</div>
              <div><h3 className="mb-2 text-sm font-semibold text-ms-navy">Dossiers</h3>{searchResults.matters.map((matter) => <p key={matter.id} className="text-sm">{matter.matterNumber} - {matter.title}</p>)}</div>
              <div><h3 className="mb-2 text-sm font-semibold text-ms-navy">Factures</h3>{searchResults.invoices.map((invoice) => <p key={invoice.id} className="text-sm">{invoice.invoiceNumber} - {invoice.matter.title}</p>)}</div>
              <div><h3 className="mb-2 text-sm font-semibold text-ms-navy">Documents</h3>{searchResults.documents.map((document) => <p key={document.id} className="text-sm">{document.documentNumber} - {document.title}</p>)}</div>
            </div>
          ) : null}
        </SectionBlock>

        <section className="grid gap-6 xl:grid-cols-[1.3fr,1fr]">
          <SectionBlock title="Gestion des dossiers" subtitle="Créer, modifier, archiver et suivre les dossiers">
            <form className="grid gap-3 text-sm" onSubmit={createMatter}>
              <input name="clientId" placeholder="ID client existant" className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5" />
              <input name="title" placeholder="Titre du dossier" className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5" />
              <textarea name="summary" placeholder="Résumé" className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5" />
              <button className="w-fit rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white">Créer le dossier</button>
            </form>
            <div className="mt-4 space-y-3">
              {matters.map((matter) => (
                <article key={matter.id} className={`rounded-2xl border p-4 ${selectedMatterId === matter.id ? "border-ms-gold bg-ms-gold/10" : "border-ms-navy/10 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" className="text-left" onClick={() => void selectMatter(matter.id)}>
                      <p className="font-semibold text-ms-navy">{matter.matterNumber} - {matter.title}</p>
                      <p className="text-xs text-ms-ink/70">{matter.client.fullName} - {matter.status} {matter.isArchived ? "- archivé" : ""}</p>
                    </button>
                    <div className="flex gap-2 text-xs">
                      <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void selectMatter(matter.id)}>Ouvrir</button>
                      {matter.isArchived ? (
                        <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void updateMatter(matter.id, "restore")}>Restaurer</button>
                      ) : (
                        <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void updateMatter(matter.id, "archive")}>Archiver</button>
                      )}
                      <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-red-700" onClick={() => { if (window.confirm("Supprimer ce dossier définitivement ?")) { void updateMatter(matter.id, "delete"); } }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionBlock>

          <div className="grid gap-6">
            <SectionBlock title="Résumé du dossier" subtitle="Chat relié au client et activité du dossier">
              {selectedMatter ? (
                <div className="space-y-3 text-sm">
                  <p className="font-semibold text-ms-navy">{selectedMatter.title}</p>
                  <p className="text-ms-ink/75">{selectedMatter.summary ?? "Aucun résumé."}</p>
                  <div className="grid gap-2 md:grid-cols-[1fr,auto]">
                    <select className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2" value={selectedMatter.status} onChange={(event) => void updateMatter(selectedMatter.id, "update", { status: event.target.value as LawMatter["status"] })}>
                      <option value="IN_PROGRESS">En cours</option>
                      <option value="PENDING">En attente</option>
                      <option value="HOLD">En pause</option>
                      <option value="CLOSED">Clôturé</option>
                    </select>
                    <button type="button" className="rounded-full border border-ms-navy/20 px-4 py-2" onClick={() => { const nextTitle = window.prompt("Nouveau titre du dossier", selectedMatter.title); if (nextTitle && nextTitle.trim().length >= 3) { void updateMatter(selectedMatter.id, "rename", { title: nextTitle.trim() }); } }}>
                      Renommer
                    </button>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ms-navy-soft">Messages</p>
                    {messagesLoading ? <p className="text-sm text-ms-ink/65">Chargement des messages...</p> : null}
                    {!messagesLoading && matterMessages.length === 0 ? <p className="text-sm text-ms-ink/65">Aucun message.</p> : null}
                    {!messagesLoading && matterMessages.map((message) => (
                      <div key={message.id} className="rounded-lg border border-ms-navy/10 bg-ms-sand/20 p-2">
                        <p className="text-xs font-semibold text-ms-navy">{message.senderName} - {new Date(message.createdAt).toLocaleString("fr-FR")}</p>
                        <p className="text-sm text-ms-ink/80">{message.body}</p>
                      </div>
                    ))}
                  </div>
                  <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Écrire un message..." className="w-full rounded-xl border border-ms-navy/15 bg-white px-4 py-3" />
                  <button type="button" onClick={sendMessage} className="rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white">Envoyer</button>
                </div>
              ) : <p className="text-sm text-ms-ink/65">Sélectionnez un dossier.</p>}
            </SectionBlock>

            <SectionBlock title="Facturation" subtitle="Factures, totaux et signatures">
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <article key={invoice.id} className={`rounded-2xl border p-4 ${selectedInvoiceId === invoice.id ? "border-ms-gold bg-ms-gold/10" : "border-ms-navy/10 bg-white"}`}>
                    <button type="button" className="text-left" onClick={() => setSelectedInvoiceId(invoice.id)}>
                      <p className="font-semibold text-ms-navy">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-ms-ink/70">{invoice.matter.title} - {invoice.client.fullName}</p>
                      <p className="text-sm">Total: {invoice.total.toLocaleString("fr-FR")} EUR - {invoice.status}</p>
                    </button>
                    <div className="mt-2 flex gap-2 text-xs">
                      <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void invoiceAction(invoice.id, "send")}>Envoyer</button>
                      <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void signInvoice(invoice.id)}>Signer</button>
                      <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void invoiceAction(invoice.id, "duplicate")}>Dupliquer</button>
                      <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void invoiceAction(invoice.id, "archive")}>Archiver</button>
                      <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void createShareLink(invoice.id)}>Lien sécurisé</button>
                      <button type="button" className="rounded-full border border-ms-navy/20 px-3 py-1" onClick={() => void revokeShareLink(invoice.id)}>Révoquer lien</button>
                      <a className="rounded-full border border-ms-navy/20 px-3 py-1" href={`/cabinet/espace/signature/${invoice.id}`}>Consulter et signer</a>
                    </div>
                  </article>
                ))}
              </div>
              {selectedInvoice ? <div className="mt-4 rounded-2xl border border-ms-navy/10 bg-white p-4 text-sm"><p className="font-semibold text-ms-navy">{selectedInvoice.invoiceNumber}</p><p>{selectedInvoice.lines.length} ligne(s) - {selectedInvoice.total.toLocaleString("fr-FR")} EUR</p></div> : null}
            </SectionBlock>
          </div>
        </section>

        <SectionBlock title="Documents" subtitle="Accès au générateur et aux documents générés">
          <DocumentTemplateManager onStatus={setStatusMessage} />
        </SectionBlock>

        <SectionBlock title="Tâches" subtitle="Suivi opérationnel partagé">
          <form className="mb-4 grid gap-3 rounded-2xl border border-ms-navy/10 bg-white p-4 text-sm" onSubmit={createTask}>
            <select value={taskForm.matterId} onChange={(event) => setTaskForm((prev) => ({ ...prev, matterId: event.target.value }))} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2">
              <option value="">Sélectionner un dossier</option>
              {matters.filter((matter) => !matter.isArchived).map((matter) => (
                <option key={matter.id} value={matter.id}>{matter.matterNumber} - {matter.title}</option>
              ))}
            </select>
            <input value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Titre de la tâche" className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2" />
            <textarea value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description (optionnelle)" className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2" />
            <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2" />
            <button type="submit" disabled={taskSaving} className="w-fit rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60">
              {taskSaving ? "Création..." : "Créer la tâche"}
            </button>
          </form>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4 text-sm">
                <p className="font-semibold text-ms-navy">{task.title}</p>
                <p className="text-ms-ink/70">{task.matter.title}</p>
                {task.description ? <p className="mt-1 text-ms-ink/75">{task.description}</p> : null}
                <p className="mt-1 text-xs text-ms-ink/60">Échéance: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-FR") : "Non définie"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <select value={task.status} onChange={(event) => void updateTaskStatus(task.id, event.target.value as Task["status"])} className="rounded-full border border-ms-navy/20 px-3 py-1">
                    <option value="TODO">A faire</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="BLOCKED">Bloquée</option>
                    <option value="DONE">Terminée</option>
                  </select>
                  <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-red-700" onClick={() => { if (window.confirm("Supprimer cette tâche ?")) { void deleteTask(task.id); } }}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionBlock>

        <SectionBlock title="Activité récente" subtitle="Derniers événements du workspace">
          <div className="space-y-2 text-sm">
            {dashboard?.recentActivity?.map((item) => <p key={`${item.kind}-${item.id}`} className="rounded-xl border border-ms-navy/10 bg-white px-4 py-3">{item.kind} - {item.title}</p>)}
          </div>
        </SectionBlock>
      </div>
    </main>
  );
}
