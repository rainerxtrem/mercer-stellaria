"use client";

import { DocumentTemplateManager } from "@/components/admin/document-template-manager";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { SectionBlock } from "@/components/dashboard/section-block";
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
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  client: { id: string; fullName: string; email: string; phone: string | null };
  participants?: Array<{
    client: { id: string; fullName: string; firstName: string | null; lastName: string | null; email: string; citizenUniqueId: string | null };
  }>;
};

type MatterClientOption = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  citizenUniqueId: string | null;
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
  lines: Array<{ id: string; pricingItemId?: string | null; description: string; quantity: number; unitPrice: number; discount: number; lineTotal: number }>;
};

type PricingItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  defaultUnitPrice: number;
  currency: string;
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  dueDate: string | null;
  updatedAt?: string;
  createdAt?: string;
  matter: { id: string; title: string; matterNumber: string };
  assignee: { id: string; fullName: string; email: string } | null;
};

type SearchResult = {
  users: Array<{ id: string; fullName: string; email: string; role: string }>;
  matters: Array<{ id: string; title: string; matterNumber: string; status: string; isArchived: boolean; client: { fullName: string; email: string }; participants?: Array<{ client: { fullName: string; citizenUniqueId: string | null } }> }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; total: number; matter: { title: string }; client: { fullName: string } }>;
  documents: Array<{ id: string; title: string; documentNumber: string; signedAt: string | null }>;
};

type DashboardData = {
  metrics: Record<string, number>;
  agenda: Array<{ id: string; dueDate: string | null; title: string; matter: { id: string; matterNumber: string; title: string } }>;
  recentActivity: Array<{ kind: string; id: string; title: string; updatedAt: string }>;
};

export type LawModuleView =
  | "all"
  | "dashboard"
  | "cases"
  | "clients"
  | "tasks"
  | "billing"
  | "document-generator"
  | "library"
  | "trainings"
  | "bar-exam"
  | "disciplinary"
  | "profile";

export type LawWorkspaceProps = {
  moduleView?: LawModuleView;
};

function formatEurAmount(value: number) {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function normalizeInvoiceStatus(status: string) {
  const value = status.toUpperCase();
  if (value.includes("PAID")) return "PAID";
  if (value.includes("CANCEL")) return "CANCELED";
  if (value.includes("ARCHIVE")) return "ARCHIVED";
  if (value.includes("SIGN")) return "TO_SIGN";
  if (value.includes("SENT")) return "SENT";
  if (value.includes("DRAFT")) return "DRAFT";
  return "PENDING";
}

function billingStatusMeta(status: string) {
  const normalized = normalizeInvoiceStatus(status);
  if (normalized === "PAID") return { label: "Payée", tone: "paid" as const };
  if (normalized === "CANCELED") return { label: "Annulée", tone: "canceled" as const };
  if (normalized === "ARCHIVED") return { label: "Archivée", tone: "archived" as const };
  if (normalized === "TO_SIGN") return { label: "À signer", tone: "to-sign" as const };
  if (normalized === "SENT") return { label: "Envoyée", tone: "sent" as const };
  if (normalized === "DRAFT") return { label: "Brouillon", tone: "draft" as const };
  return { label: "En attente", tone: "pending" as const };
}

function billingStatusToneClass(tone: ReturnType<typeof billingStatusMeta>["tone"]) {
  if (tone === "paid") return "border-emerald-300/60 bg-emerald-400/20 text-emerald-100";
  if (tone === "to-sign") return "border-amber-300/60 bg-amber-300/20 text-amber-100";
  if (tone === "sent") return "border-sky-300/60 bg-sky-300/20 text-sky-100";
  if (tone === "draft") return "border-zinc-300/60 bg-zinc-300/20 text-zinc-100";
  if (tone === "canceled") return "border-rose-300/60 bg-rose-300/20 text-rose-100";
  if (tone === "archived") return "border-violet-300/60 bg-violet-300/20 text-violet-100";
  return "border-orange-300/60 bg-orange-300/20 text-orange-100";
}

function getMatterStatusBadge(status: LawMatter["status"]) {
  if (status === "IN_PROGRESS") return { label: "En cours", className: "border-emerald-300/60 bg-emerald-500/15 text-emerald-700" };
  if (status === "PENDING") return { label: "En attente", className: "border-amber-300/60 bg-amber-500/15 text-amber-700" };
  if (status === "HOLD") return { label: "En instance", className: "border-slate-300/60 bg-slate-500/15 text-slate-700" };
  return { label: "Clôturé", className: "border-violet-300/60 bg-violet-500/15 text-violet-700" };
}

function getMatterPriority(matter: LawMatter, tasks: Task[]) {
  const matterTasks = tasks.filter((task) => task.matter.id === matter.id);
  const overdue = matterTasks.some((task) => task.status !== "DONE" && task.dueDate && new Date(task.dueDate) < new Date());
  if (matter.status === "HOLD" || overdue) return { label: "Urgent", className: "border-rose-300/60 bg-rose-500/15 text-rose-700" };
  if (matter.status === "PENDING" || matterTasks.some((task) => task.status === "IN_PROGRESS" || task.status === "BLOCKED")) return { label: "Élevée", className: "border-orange-300/60 bg-orange-500/15 text-orange-700" };
  return { label: "Standard", className: "border-sky-300/60 bg-sky-500/15 text-sky-700" };
}

function getMatterType(matter: LawMatter) {
  if (matter.isArchived) return "Archivage";
  if (matter.status === "HOLD") return "Contentieux";
  return "Mandat";
}

export default function LawFirmWorkspacePage({ moduleView = "all" }: LawWorkspaceProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [matters, setMatters] = useState<LawMatter[]>([]);
  const [matterClients, setMatterClients] = useState<MatterClientOption[]>([]);
  const [invoices, setInvoices] = useState<LawInvoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskForm, setTaskForm] = useState({ matterId: "", title: "", description: "", dueDate: "" });
  const [taskSaving, setTaskSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [matterStatusFilter, setMatterStatusFilter] = useState<"ALL" | "IN_PROGRESS" | "PENDING" | "HOLD" | "CLOSED">("ALL");
  const [showArchivedMatters, setShowArchivedMatters] = useState(false);
  const [matterSearch, setMatterSearch] = useState("");
  const [matterClientQuery, setMatterClientQuery] = useState("");
  const [matterCreateForm, setMatterCreateForm] = useState({
    title: "",
    summary: "",
    clientIds: [] as string[],
  });
  const [pricingCatalog, setPricingCatalog] = useState<PricingItem[]>([]);
  const [invoiceFormSaving, setInvoiceFormSaving] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    matterId: "",
    clientId: "",
    dueDate: "",
    lines: [
      {
        pricingItemId: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
        discount: "0",
        vatRate: "20",
      },
    ],
  });
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [matterViewMode, setMatterViewMode] = useState<"CARDS" | "LIST" | "KANBAN">("CARDS");
  const [matterSort, setMatterSort] = useState<"RECENT" | "DEADLINE" | "STATUS">("RECENT");
  const [matterPriorityFilter, setMatterPriorityFilter] = useState<"ALL" | "URGENT" | "HIGH" | "STANDARD">("ALL");
  const [matterVisibleCount, setMatterVisibleCount] = useState(6);
  const [matterFavorites, setMatterFavorites] = useState<string[]>([]);
  const [recentlyViewedMatterIds, setRecentlyViewedMatterIds] = useState<string[]>([]);
  const [activeMatterTab, setActiveMatterTab] = useState<"overview" | "clients" | "documents" | "contracts" | "billing" | "tasks" | "calendar" | "messaging" | "activity" | "history" | "notes" | "pieces" | "signatures">("overview");
  const [billingSearch, setBillingSearch] = useState("");
  const [billingStatusFilter, setBillingStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "TO_SIGN" | "CANCELED" | "ARCHIVED">("ALL");
  const [billingSort, setBillingSort] = useState<"RECENT" | "AMOUNT_DESC" | "AMOUNT_ASC">("RECENT");
  const [billingView, setBillingView] = useState<"CARDS" | "LIST">("CARDS");
  const [billingPage, setBillingPage] = useState(1);
  const [openInvoiceActionMenuId, setOpenInvoiceActionMenuId] = useState<string | null>(null);
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
    const [dashboardRes, mattersRes, invoicesRes, tasksRes, pricingRes, clientsRes] = await Promise.all([
      fetch("/api/law-firm/dashboard"),
      fetch("/api/law-firm/matters"),
      fetch("/api/law-firm/invoices"),
      fetch("/api/law-firm/tasks"),
      fetch("/api/law-firm/pricing"),
      fetch("/api/law-firm/clients"),
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
    if (pricingRes.ok) {
      setPricingCatalog((await pricingRes.json()).data ?? []);
    }
    if (clientsRes.ok) {
      setMatterClients((await clientsRes.json()).data ?? []);
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
  const invoiceDraftSummary = useMemo(() => {
    const ht = invoiceForm.lines.reduce((sum, line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const discount = Number(line.discount) || 0;
      const lineHt = quantity * unitPrice * (1 - discount / 100);
      return sum + Math.max(0, lineHt);
    }, 0);

    const vat = invoiceForm.lines.reduce((sum, line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const discount = Number(line.discount) || 0;
      const vatRate = Number(line.vatRate) || 0;
      const lineHt = quantity * unitPrice * (1 - discount / 100);
      return sum + Math.max(0, lineHt) * (vatRate / 100);
    }, 0);

    return {
      ht,
      vat,
      ttc: ht + vat,
    };
  }, [invoiceForm.lines]);

  const billingRevenue = useMemo(
    () => invoices.filter((invoice) => normalizeInvoiceStatus(invoice.status) === "PAID").reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    [invoices],
  );

  const billingUnpaidTotal = useMemo(
    () =>
      invoices
        .filter((invoice) => {
          const status = normalizeInvoiceStatus(invoice.status);
          return status !== "PAID" && status !== "CANCELED";
        })
        .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    [invoices],
  );

  const billingPaidCount = useMemo(() => invoices.filter((invoice) => normalizeInvoiceStatus(invoice.status) === "PAID").length, [invoices]);
  const billingPendingCount = useMemo(
    () => invoices.filter((invoice) => ["PENDING", "SENT", "DRAFT"].includes(normalizeInvoiceStatus(invoice.status))).length,
    [invoices],
  );
  const billingToSignCount = useMemo(() => invoices.filter((invoice) => normalizeInvoiceStatus(invoice.status) === "TO_SIGN").length, [invoices]);

  const filteredInvoices = useMemo(() => {
    const query = billingSearch.trim().toLowerCase();
    const bySearch = invoices.filter((invoice) => {
      if (!query) return true;
      const stack = `${invoice.invoiceNumber} ${invoice.client.fullName} ${invoice.client.email} ${invoice.matter.matterNumber} ${invoice.matter.title}`.toLowerCase();
      return stack.includes(query);
    });

    const byStatus = bySearch.filter((invoice) => {
      if (billingStatusFilter === "ALL") return true;
      return normalizeInvoiceStatus(invoice.status) === billingStatusFilter;
    });

    const sorted = [...byStatus].sort((a, b) => {
      if (billingSort === "AMOUNT_DESC") return Number(b.total || 0) - Number(a.total || 0);
      if (billingSort === "AMOUNT_ASC") return Number(a.total || 0) - Number(b.total || 0);

      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return bDate - aDate;
    });

    return sorted;
  }, [billingSearch, billingSort, billingStatusFilter, invoices]);

  const billingPageSize = billingView === "CARDS" ? 6 : 10;
  const billingTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / billingPageSize));
  const paginatedInvoices = useMemo(() => {
    const start = (billingPage - 1) * billingPageSize;
    return filteredInvoices.slice(start, start + billingPageSize);
  }, [billingPage, billingPageSize, filteredInvoices]);
  const selectedMatterClients = useMemo(
    () => matterClients.filter((client) => matterCreateForm.clientIds.includes(client.id)),
    [matterClients, matterCreateForm.clientIds],
  );
  const filteredMatterClients = useMemo(() => {
    const query = matterClientQuery.trim().toLowerCase();
    return matterClients.filter((client) => {
      if (!query) {
        return true;
      }
      const haystack = `${client.fullName} ${client.firstName ?? ""} ${client.lastName ?? ""} ${client.citizenUniqueId ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [matterClients, matterClientQuery]);
  const filteredMatters = useMemo(() => {
    const keyword = matterSearch.trim().toLowerCase();
    const nextMatters = matters.filter((matter) => {
      if (!showArchivedMatters && matter.isArchived) {
        return false;
      }
      if (matterStatusFilter !== "ALL" && matter.status !== matterStatusFilter) {
        return false;
      }
      const priority = getMatterPriority(matter, tasks);
      if (matterPriorityFilter !== "ALL" && priority.label !== (matterPriorityFilter === "URGENT" ? "Urgent" : matterPriorityFilter === "HIGH" ? "Élevée" : "Standard")) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const participantText = (matter.participants ?? []).map((entry) => `${entry.client.fullName} ${entry.client.citizenUniqueId ?? ""}`).join(" ");
      const haystack = `${matter.matterNumber} ${matter.title} ${matter.client.fullName} ${matter.client.email} ${participantText}`.toLowerCase();
      return haystack.includes(keyword);
    });

    return [...nextMatters].sort((a, b) => {
      if (matterSort === "DEADLINE") {
        const aNextDeadline = tasks.find((task) => task.matter.id === a.id && task.dueDate && task.status !== "DONE")?.dueDate ?? a.lastActivityAt;
        const bNextDeadline = tasks.find((task) => task.matter.id === b.id && task.dueDate && task.status !== "DONE")?.dueDate ?? b.lastActivityAt;
        return new Date(aNextDeadline).getTime() - new Date(bNextDeadline).getTime();
      }
      if (matterSort === "STATUS") {
        return a.status.localeCompare(b.status);
      }
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }, [matters, matterPriorityFilter, matterSearch, matterSort, matterStatusFilter, showArchivedMatters, tasks]);

  const matterStats = useMemo(() => {
    const opened = matters.filter((matter) => !matter.isArchived && matter.status !== "CLOSED").length;
    const pending = matters.filter((matter) => matter.status === "PENDING").length;
    const urgent = matters.filter((matter) => getMatterPriority(matter, tasks).label === "Urgent").length;
    const archived = matters.filter((matter) => matter.isArchived).length;
    const closed = matters.filter((matter) => matter.status === "CLOSED").length;
    const favorites = matters.filter((matter) => matterFavorites.includes(matter.id)).length;

    return [
      { label: "Dossiers ouverts", value: opened, detail: "Actifs aujourd’hui" },
      { label: "En attente", value: pending, detail: "À traiter" },
      { label: "Urgents", value: urgent, detail: "Priorité élevée" },
      { label: "Archivés", value: archived, detail: "Stockage" },
      { label: "Clôturés", value: closed, detail: "Historique" },
      { label: "Favoris", value: favorites, detail: "Sélectionnés" },
    ];
  }, [matterFavorites, matters, tasks]);

  const visibleMatters = useMemo(() => filteredMatters.slice(0, matterVisibleCount), [filteredMatters, matterVisibleCount]);

  useEffect(() => {
    setMatterVisibleCount(6);
  }, [matterSearch, matterStatusFilter, matterPriorityFilter, matterSort, showArchivedMatters]);

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
    setRecentlyViewedMatterIds((prev) => [matterId, ...prev.filter((id) => id !== matterId)].slice(0, 5));
    setActiveMatterTab("overview");
    await loadMatterMessages(matterId);
  }

  function toggleMatterFavorite(matterId: string) {
    setMatterFavorites((prev) => (prev.includes(matterId) ? prev.filter((item) => item !== matterId) : [...prev, matterId]));
  }

  function toggleMatterClient(clientId: string) {
    setMatterCreateForm((prev) => ({
      ...prev,
      clientIds: prev.clientIds.includes(clientId) ? prev.clientIds.filter((value) => value !== clientId) : [...prev.clientIds, clientId],
    }));
  }

  async function createMatter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matterCreateForm.title.trim()) {
      setStatusMessage("Le titre du dossier est requis.");
      return;
    }
    if (matterCreateForm.clientIds.length === 0) {
      setStatusMessage("Sélectionnez au moins un client.");
      return;
    }

    const response = await fetch("/api/law-firm/matters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientIds: matterCreateForm.clientIds,
        title: matterCreateForm.title.trim(),
        summary: matterCreateForm.summary.trim() || undefined,
      }),
    });

    if (response.ok) {
      setMatterCreateForm({ title: "", summary: "", clientIds: [] });
      setMatterClientQuery("");
    }

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

  async function invoiceAction(invoiceId: string, action: "send" | "duplicate" | "archive" | "mark_paid" | "cancel" | "delete") {
    const response = await fetch("/api/law-firm/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, action }),
    });

    const messages: Record<string, string> = {
      send: response.ok ? "Facture envoyée." : "Envoi impossible.",
      duplicate: response.ok ? "Facture dupliquée." : "Duplication impossible.",
      archive: response.ok ? "Facture archivée." : "Archivage impossible.",
      mark_paid: response.ok ? "Facture marquée payée." : "Mise à jour impossible.",
      cancel: response.ok ? "Facture annulée." : "Annulation impossible.",
      delete: response.ok ? "Facture supprimée." : "Suppression impossible.",
    };
    setStatusMessage(messages[action]);
    setOpenInvoiceActionMenuId(null);

    if (response.ok) {
      await loadWorkspace();
    }
  }

  function syncInvoiceMatter(matterId: string) {
    const matter = matters.find((item) => item.id === matterId);
    setInvoiceForm((prev) => ({
      ...prev,
      matterId,
      clientId: matter?.client.id ?? "",
    }));
  }

  function resetInvoiceForm() {
    setEditingInvoiceId(null);
    setInvoiceForm({
      matterId: "",
      clientId: "",
      dueDate: "",
      lines: [{ pricingItemId: "", description: "", quantity: "1", unitPrice: "0", discount: "0", vatRate: "20" }],
    });
  }

  function editInvoice(invoice: LawInvoice) {
    setEditingInvoiceId(invoice.id);
    setSelectedInvoiceId(invoice.id);
    setInvoiceForm({
      matterId: invoice.matter.id,
      clientId: invoice.client.id,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "",
      lines: invoice.lines.length
        ? invoice.lines.map((line) => ({
            pricingItemId: line.pricingItemId ?? "",
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            discount: String(line.discount),
            vatRate: "20",
          }))
        : [{ pricingItemId: "", description: "", quantity: "1", unitPrice: "0", discount: "0", vatRate: "20" }],
    });
  }

  function updateInvoiceLine(index: number, key: "pricingItemId" | "description" | "quantity" | "unitPrice" | "discount" | "vatRate", value: string) {
    setInvoiceForm((prev) => {
      const nextLines = [...prev.lines];
      nextLines[index] = { ...nextLines[index], [key]: value };

      if (key === "pricingItemId") {
        const pricing = pricingCatalog.find((item) => item.id === value);
        if (pricing) {
          nextLines[index].description = pricing.name;
          nextLines[index].unitPrice = String(pricing.defaultUnitPrice);
        }
      }

      return { ...prev, lines: nextLines };
    });
  }

  function addInvoiceLine() {
    setInvoiceForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { pricingItemId: "", description: "", quantity: "1", unitPrice: "0", discount: "0", vatRate: "20" }],
    }));
  }

  function removeInvoiceLine(index: number) {
    setInvoiceForm((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoiceForm.matterId || !invoiceForm.clientId) {
      setStatusMessage("Sélectionnez un dossier valide pour la facture.");
      return;
    }

    const lines = invoiceForm.lines
      .map((line) => ({
        pricingItemId: line.pricingItemId || null,
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        discount: Number(line.discount || "0"),
      }))
      .filter((line) => line.description && Number.isFinite(line.quantity) && Number.isFinite(line.unitPrice));

    if (lines.length === 0) {
      setStatusMessage("Ajoutez au moins une ligne de prestation valide.");
      return;
    }

    setInvoiceFormSaving(true);
    const response = await fetch(
      "/api/law-firm/invoices",
      editingInvoiceId
        ? {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoiceId: editingInvoiceId,
              action: "update",
              matterId: invoiceForm.matterId,
              clientId: invoiceForm.clientId,
              dueDate: invoiceForm.dueDate || null,
              lines,
            }),
          }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matterId: invoiceForm.matterId,
              clientId: invoiceForm.clientId,
              dueDate: invoiceForm.dueDate || null,
              lines,
            }),
          },
    );

    setInvoiceFormSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatusMessage(payload?.error ?? "Création de facture impossible.");
      return;
    }

    resetInvoiceForm();

    setStatusMessage(editingInvoiceId ? "Facture modifiée." : "Facture créée.");
    await loadWorkspace();
    setBillingPage(1);
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

  const selectedMatterTasks = useMemo(() => tasks.filter((task) => task.matter.id === selectedMatter?.id), [selectedMatter, tasks]);
  const selectedMatterInvoices = useMemo(() => invoices.filter((invoice) => invoice.matter.id === selectedMatter?.id), [selectedMatter, invoices]);
  const selectedMatterProgress = useMemo(() => {
    if (!selectedMatter) {
      return 0;
    }
    const total = selectedMatterTasks.length || 1;
    const done = selectedMatterTasks.filter((task) => task.status === "DONE").length;
    return Math.round((done / total) * 100);
  }, [selectedMatter, selectedMatterTasks]);
  const selectedMatterNextDeadline = useMemo(() => {
    if (!selectedMatter) {
      return null;
    }
    return selectedMatterTasks.filter((task) => task.dueDate && task.status !== "DONE").sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime())[0] ?? null;
  }, [selectedMatter, selectedMatterTasks]);
  const selectedMatterTimeline = useMemo(() => {
    if (!selectedMatter) {
      return [] as Array<{ title: string; detail: string; timestamp: string; author: string; type: string }>;
    }

    const items = [
      {
        title: "Dossier créé",
        detail: `${selectedMatter.title} enregistré dans le portefeuille juridique`,
        timestamp: selectedMatter.createdAt,
        author: "Système",
        type: "creation",
      },
      ...selectedMatterTasks.map((task) => ({
        title: `Tâche ${task.status === "DONE" ? "clôturée" : "mise à jour"}`,
        detail: task.title,
        timestamp: task.updatedAt,
        author: task.assignee?.fullName ?? "Équipe",
        type: "task",
      })),
      ...matterMessages.map((message) => ({
        title: "Message envoyé",
        detail: message.body,
        timestamp: message.createdAt,
        author: message.senderName,
        type: "message",
      })),
      ...selectedMatterInvoices.map((invoice) => ({
        title: `Facture ${invoice.status}`,
        detail: `${invoice.invoiceNumber} · ${formatEurAmount(invoice.total)}`,
        timestamp: invoice.dueDate ?? selectedMatter.updatedAt,
        author: invoice.client.fullName,
        type: "invoice",
      })),
    ];

    return items
      .map((item) => ({ ...item, timestamp: item.timestamp ?? selectedMatter.updatedAt }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [matterMessages, selectedMatter, selectedMatterInvoices, selectedMatterTasks]);

  const metrics = [
    { label: "Dossiers actifs", value: String(dashboard?.metrics.activeMatters ?? 0), detail: "En cours" },
    { label: "Dossiers en retard", value: String(dashboard?.metrics.overdueMatters ?? 0), detail: "Actions urgentes" },
    { label: "Devis en attente", value: String(dashboard?.metrics.pendingQuotes ?? 0), detail: "Brouillons à envoyer" },
    { label: "Dossiers en attente", value: String(dashboard?.metrics.pendingMatters ?? 0), detail: "À traiter" },
    { label: "Factures impayées", value: String(dashboard?.metrics.unpaidInvoices ?? 0), detail: "À encaisser" },
    { label: "Documents à signer", value: String(dashboard?.metrics.documentsToSign ?? 0), detail: "En attente de signature" },
    { label: "Tâches ouvertes", value: String(dashboard?.metrics.openTasks ?? 0), detail: "Suivi équipe" },
  ];

  const showDashboard = moduleView === "all" || moduleView === "dashboard";
  const showCases = moduleView === "all" || moduleView === "cases";
  const showClients = moduleView === "all" || moduleView === "clients";
  const showTasks = moduleView === "all" || moduleView === "tasks";
  const showBilling = moduleView === "all" || moduleView === "billing";
  const showDocuments = moduleView === "all" || moduleView === "document-generator";
  const showLibrary = moduleView === "all" || moduleView === "library";
  const showTrainings = moduleView === "all" || moduleView === "trainings";
  const showBarExam = moduleView === "all" || moduleView === "bar-exam";
  const showDisciplinary = moduleView === "all" || moduleView === "disciplinary";
  const showProfile = moduleView === "all" || moduleView === "profile";

  useEffect(() => {
    setBillingPage(1);
  }, [billingSearch, billingStatusFilter, billingSort, billingView]);

  useEffect(() => {
    if (billingPage > billingTotalPages) {
      setBillingPage(billingTotalPages);
    }
  }, [billingPage, billingTotalPages]);

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
        <header className="workspace-hero">
          <p className="workspace-kicker">Law Firm</p>
          <h1 className="workspace-title">Espace de travail juridique</h1>
          <p className="workspace-subtitle">Dossiers, documents, facturation, chat et recherche unifiée pour les collaborateurs autorisés.</p>
        </header>

        {statusMessage ? <div className="rounded-2xl border border-ms-navy/15 bg-white px-4 py-3 text-sm font-semibold text-ms-navy">{statusMessage}</div> : null}

        {showDashboard ? <MetricsGrid items={metrics} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" /> : null}

        {showDashboard ? (
          <SectionBlock title="Raccourcis rapides" subtitle="Accès direct aux actions clés du module">
            <div className="flex flex-wrap gap-2 text-sm">
              <button type="button" className="rounded-full border border-ms-navy/20 px-4 py-2 font-semibold text-ms-navy" onClick={() => document.getElementById("law-firm-invoice-form")?.scrollIntoView({ behavior: "smooth" })}>Créer une facture</button>
              <button type="button" className="rounded-full border border-ms-navy/20 px-4 py-2 font-semibold text-ms-navy" onClick={() => document.getElementById("law-firm-tasks")?.scrollIntoView({ behavior: "smooth" })}>Créer une tâche</button>
              <button type="button" className="rounded-full border border-ms-navy/20 px-4 py-2 font-semibold text-ms-navy" onClick={() => document.getElementById("law-firm-documents")?.scrollIntoView({ behavior: "smooth" })}>Ouvrir les documents</button>
            </div>
          </SectionBlock>
        ) : null}

        {showDashboard || showCases || showClients || showBilling || showDocuments ? (
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
        ) : null}

        {showCases || showBilling ? (
          <section className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
            {showCases ? (
              <div className="space-y-6">
                <SectionBlock title="Dashboard des dossiers" subtitle="Vue premium, filtres instantanés et suivi métier">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {matterStats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-ms-navy/10 bg-ms-cream/50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-ms-navy-soft">{stat.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-ms-navy">{stat.value}</p>
                        <p className="text-sm text-ms-ink/70">{stat.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                    <div className="rounded-3xl border border-ms-navy/10 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ms-navy">Recherche et filtres</p>
                          <p className="text-sm text-ms-ink/70">Analyse intelligente des dossiers et priorités</p>
                        </div>
                        <div className="flex gap-2 rounded-full border border-ms-navy/10 p-1">
                          {(["CARDS", "LIST", "KANBAN"] as const).map((view) => (
                            <button key={view} type="button" onClick={() => setMatterViewMode(view)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${matterViewMode === view ? "bg-ms-navy text-white" : "text-ms-navy"}`}>
                              {view === "CARDS" ? "Cartes" : view === "LIST" ? "Liste" : "Kanban"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <input value={matterSearch} onChange={(event) => setMatterSearch(event.target.value)} placeholder="Numéro, titre, client..." className="rounded-2xl border border-ms-navy/15 bg-ms-cream/40 px-3 py-2 text-sm" />
                        <select value={matterStatusFilter} onChange={(event) => setMatterStatusFilter(event.target.value as "ALL" | "IN_PROGRESS" | "PENDING" | "HOLD" | "CLOSED")} className="rounded-2xl border border-ms-navy/15 bg-ms-cream/40 px-3 py-2 text-sm">
                          <option value="ALL">Tous les statuts</option>
                          <option value="IN_PROGRESS">En cours</option>
                          <option value="PENDING">En attente</option>
                          <option value="HOLD">En instance</option>
                          <option value="CLOSED">Clôturé</option>
                        </select>
                        <select value={matterPriorityFilter} onChange={(event) => setMatterPriorityFilter(event.target.value as "ALL" | "URGENT" | "HIGH" | "STANDARD")} className="rounded-2xl border border-ms-navy/15 bg-ms-cream/40 px-3 py-2 text-sm">
                          <option value="ALL">Toutes priorités</option>
                          <option value="URGENT">Urgent</option>
                          <option value="HIGH">Élevée</option>
                          <option value="STANDARD">Standard</option>
                        </select>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 rounded-full border border-ms-navy/10 bg-ms-cream/40 px-3 py-2 text-sm text-ms-navy">
                          <input type="checkbox" checked={showArchivedMatters} onChange={(event) => setShowArchivedMatters(event.target.checked)} />
                          Inclure archivés
                        </label>
                        <select value={matterSort} onChange={(event) => setMatterSort(event.target.value as "RECENT" | "DEADLINE" | "STATUS")} className="rounded-full border border-ms-navy/10 bg-white px-3 py-2 text-sm text-ms-navy">
                          <option value="RECENT">Récent</option>
                          <option value="DEADLINE">Échéance</option>
                          <option value="STATUS">Statut</option>
                        </select>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-ms-navy/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-slate-50">
                      <p className="text-sm font-semibold">Créer un nouveau dossier</p>
                      <p className="mt-1 text-sm text-slate-300">Un workflow premium pour initier rapidement un mandat ou un contentieux.</p>
                      <form className="mt-4 grid gap-3 text-sm" onSubmit={createMatter}>
                        <input value={matterCreateForm.title} onChange={(event) => setMatterCreateForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Titre du dossier" className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-50" />
                        <textarea value={matterCreateForm.summary} onChange={(event) => setMatterCreateForm((prev) => ({ ...prev, summary: event.target.value }))} placeholder="Résumé du mandat" className="min-h-[88px] rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-50" />
                        <input value={matterClientQuery} onChange={(event) => setMatterClientQuery(event.target.value)} placeholder="Rechercher un client" className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-50" />
                        <div className="max-h-32 space-y-1 overflow-auto rounded-2xl border border-slate-700 bg-slate-900/70 p-2">
                          {filteredMatterClients.slice(0, 20).map((client) => {
                            const checked = matterCreateForm.clientIds.includes(client.id);
                            return (
                              <label key={client.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1 text-sm text-slate-200 hover:bg-slate-800/70">
                                <input type="checkbox" checked={checked} onChange={() => toggleMatterClient(client.id)} />
                                <span>{client.fullName}</span>
                              </label>
                            );
                          })}
                        </div>
                        <button className="w-fit rounded-full bg-cyan-400 px-4 py-2 font-semibold text-slate-950">Créer le dossier</button>
                      </form>
                    </div>
                  </div>

                  {recentlyViewedMatterIds.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {recentlyViewedMatterIds.map((matterId) => {
                        const matter = matters.find((item) => item.id === matterId);
                        if (!matter) return null;
                        return (
                          <button key={matter.id} type="button" onClick={() => void selectMatter(matter.id)} className="rounded-full border border-ms-navy/10 bg-white px-3 py-2 text-sm text-ms-navy">
                            {matter.matterNumber}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {matterFavorites.length ? (
                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      {matters.filter((matter) => matterFavorites.includes(matter.id)).slice(0, 3).map((matter) => {
                        const status = getMatterStatusBadge(matter.status);
                        const priority = getMatterPriority(matter, tasks);
                        return (
                          <button key={matter.id} type="button" onClick={() => void selectMatter(matter.id)} className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-left">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-ms-navy">{matter.matterNumber}</p>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priority.className}`}>{priority.label}</span>
                            </div>
                            <p className="mt-2 text-sm text-ms-ink/80">{matter.title}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className={`rounded-full border px-2 py-1 text-[11px] ${status.className}`}>{status.label}</span>
                              <span className="rounded-full border border-ms-navy/10 bg-white px-2 py-1 text-[11px] text-ms-navy">{getMatterType(matter)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {matterViewMode === "KANBAN" ? (
                    <div className="mt-5 grid gap-4 lg:grid-cols-4">
                      {(["IN_PROGRESS", "PENDING", "HOLD", "CLOSED"] as const).map((columnStatus) => (
                        <div key={columnStatus} className="rounded-3xl border border-ms-navy/10 bg-white p-3">
                          <p className="text-sm font-semibold text-ms-navy">{getMatterStatusBadge(columnStatus).label}</p>
                          <div className="mt-3 space-y-2">
                            {visibleMatters.filter((matter) => matter.status === columnStatus).map((matter) => {
                              const status = getMatterStatusBadge(matter.status);
                              const priority = getMatterPriority(matter, tasks);
                              return (
                                <button key={matter.id} type="button" onClick={() => void selectMatter(matter.id)} className="w-full rounded-2xl border border-ms-navy/10 bg-ms-cream/30 p-3 text-left">
                                  <p className="text-sm font-semibold text-ms-navy">{matter.matterNumber}</p>
                                  <p className="mt-1 text-sm text-ms-ink/80">{matter.title}</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`rounded-full px-2 py-1 text-[11px] ${status.className}`}>{status.label}</span>
                                    <span className={`rounded-full px-2 py-1 text-[11px] ${priority.className}`}>{priority.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : matterViewMode === "LIST" ? (
                    <div className="mt-5 overflow-hidden rounded-3xl border border-ms-navy/10 bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-ms-cream/50 text-ms-navy">
                          <tr>
                            <th className="px-4 py-3">Dossier</th>
                            <th className="px-4 py-3">Client</th>
                            <th className="px-4 py-3">Statut</th>
                            <th className="px-4 py-3">Échéance</th>
                            <th className="px-4 py-3">Dernière activité</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleMatters.map((matter) => {
                            const status = getMatterStatusBadge(matter.status);
                            const priority = getMatterPriority(matter, tasks);
                            const nextTask = tasks.find((task) => task.matter.id === matter.id && task.dueDate && task.status !== "DONE")?.dueDate ?? null;
                            return (
                              <tr key={matter.id} className="border-t border-ms-navy/10">
                                <td className="px-4 py-3">
                                  <button type="button" onClick={() => void selectMatter(matter.id)} className="text-left">
                                    <p className="font-semibold text-ms-navy">{matter.matterNumber}</p>
                                    <p className="text-sm text-ms-ink/80">{matter.title}</p>
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-ms-ink/80">{matter.client.fullName}</td>
                                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[11px] ${status.className}`}>{status.label}</span></td>
                                <td className="px-4 py-3 text-ms-ink/80">{nextTask ? new Date(nextTask).toLocaleDateString("fr-FR") : "—"}</td>
                                <td className="px-4 py-3 text-ms-ink/80">{new Date(matter.lastActivityAt).toLocaleDateString("fr-FR")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-3 xl:grid-cols-2">
                      {visibleMatters.map((matter) => {
                        const status = getMatterStatusBadge(matter.status);
                        const priority = getMatterPriority(matter, tasks);
                        const nextTask = tasks.find((task) => task.matter.id === matter.id && task.dueDate && task.status !== "DONE")?.dueDate ?? null;
                        return (
                          <button key={matter.id} type="button" onClick={() => void selectMatter(matter.id)} className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${selectedMatterId === matter.id ? "border-ms-gold bg-ms-gold/10" : "border-ms-navy/10 bg-white"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-ms-navy">{matter.matterNumber}</p>
                                <p className="mt-1 text-base font-semibold text-ms-ink">{matter.title}</p>
                              </div>
                              <button type="button" onClick={(event) => { event.stopPropagation(); toggleMatterFavorite(matter.id); }} className="rounded-full border border-ms-navy/10 px-2 py-1 text-xs text-ms-navy">
                                {matterFavorites.includes(matter.id) ? "★" : "☆"}
                              </button>
                            </div>
                            <p className="mt-3 text-sm text-ms-ink/75">{matter.client.fullName}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className={`rounded-full border px-2 py-1 text-[11px] ${status.className}`}>{status.label}</span>
                              <span className={`rounded-full border px-2 py-1 text-[11px] ${priority.className}`}>{priority.label}</span>
                              <span className="rounded-full border border-ms-navy/10 bg-white px-2 py-1 text-[11px] text-ms-navy">{getMatterType(matter)}</span>
                            </div>
                            <div className="mt-4 grid gap-2 text-sm text-ms-ink/75 sm:grid-cols-2">
                              <p><span className="font-semibold">Créé :</span> {new Date(matter.createdAt).toLocaleDateString("fr-FR")}</p>
                              <p><span className="font-semibold">Activité :</span> {new Date(matter.lastActivityAt).toLocaleDateString("fr-FR")}</p>
                              <p><span className="font-semibold">Échéance :</span> {nextTask ? new Date(nextTask).toLocaleDateString("fr-FR") : "À définir"}</p>
                              <p><span className="font-semibold">Collab. :</span> {(matter.participants ?? []).length + 1}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredMatters.length > matterVisibleCount ? (
                    <div className="mt-5 text-center">
                      <button type="button" onClick={() => setMatterVisibleCount((prev) => prev + 4)} className="rounded-full border border-ms-navy/15 bg-white px-4 py-2 text-sm font-semibold text-ms-navy">
                        Charger plus de dossiers
                      </button>
                    </div>
                  ) : null}
                </SectionBlock>
              </div>
            ) : null}

            <div className="grid gap-6">
              {showCases ? (
                <SectionBlock title="Dossier sélectionné" subtitle="Espace de travail juridique premium">
                  {!selectedMatter ? (
                    <div className="rounded-3xl border border-dashed border-ms-navy/20 bg-ms-cream/40 p-6 text-center text-sm text-ms-ink/70">
                      Sélectionnez un dossier pour ouvrir le cockpit métier et accéder à ses informations clés.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-ms-navy/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-slate-50">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">{selectedMatter.matterNumber}</p>
                            <h3 className="mt-2 text-2xl font-semibold">{selectedMatter.title}</h3>
                            <p className="mt-2 max-w-2xl text-sm text-slate-300">{selectedMatter.summary ?? "Résumé à compléter pour enrichir le suivi du mandat."}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getMatterStatusBadge(selectedMatter.status).className}`}>{getMatterStatusBadge(selectedMatter.status).label}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getMatterPriority(selectedMatter, tasks).className}`}>{getMatterPriority(selectedMatter, tasks).label}</span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Progression</p>
                            <p className="mt-2 text-xl font-semibold text-cyan-200">{selectedMatterProgress}%</p>
                          </div>
                          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Responsable</p>
                            <p className="mt-2 text-sm font-semibold text-slate-50">{selectedMatter.client.fullName}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Prochaine échéance</p>
                            <p className="mt-2 text-sm font-semibold text-slate-50">{selectedMatterNextDeadline ? new Date(selectedMatterNextDeadline.dueDate as string).toLocaleDateString("fr-FR") : "À définir"}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Type</p>
                            <p className="mt-2 text-sm font-semibold text-slate-50">{getMatterType(selectedMatter)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-ms-navy/10 bg-white p-3">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: "overview", label: "Vue générale" },
                            { id: "clients", label: "Clients" },
                            { id: "documents", label: "Documents" },
                            { id: "contracts", label: "Contrats" },
                            { id: "billing", label: "Facturation" },
                            { id: "tasks", label: "Tâches" },
                            { id: "calendar", label: "Calendrier" },
                            { id: "messaging", label: "Messagerie" },
                            { id: "activity", label: "Journal" },
                            { id: "history", label: "Historique" },
                            { id: "notes", label: "Notes" },
                            { id: "pieces", label: "Pièces" },
                            { id: "signatures", label: "Signatures" },
                          ].map((tab) => (
                            <button key={tab.id} type="button" onClick={() => setActiveMatterTab(tab.id as typeof activeMatterTab)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${activeMatterTab === tab.id ? "bg-ms-navy text-white" : "bg-ms-cream/60 text-ms-navy"}`}>
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 space-y-3">
                          {activeMatterTab === "overview" ? (
                            <div className="grid gap-3 xl:grid-cols-2">
                              <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4">
                                <p className="text-sm font-semibold text-ms-navy">Résumé automatique</p>
                                <p className="mt-2 text-sm text-ms-ink/80">Le mandat est actuellement à {selectedMatterProgress}% de progression avec {selectedMatterTasks.length} tâches suivies et {selectedMatterInvoices.length} facture(s) rattachée(s).</p>
                              </div>
                              <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4">
                                <p className="text-sm font-semibold text-ms-navy">Échéances importantes</p>
                                <p className="mt-2 text-sm text-ms-ink/80">{selectedMatterNextDeadline ? `${selectedMatterNextDeadline.title} · ${new Date(selectedMatterNextDeadline.dueDate as string).toLocaleDateString("fr-FR")}` : "Aucune échéance planifiée à ce stade."}</p>
                              </div>
                              <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4">
                                <p className="text-sm font-semibold text-ms-navy">Derniers messages</p>
                                <div className="mt-2 space-y-2">
                                  {matterMessages.slice(0, 2).map((message) => (
                                    <div key={message.id} className="rounded-xl border border-ms-navy/10 bg-white p-2 text-sm text-ms-ink/80">
                                      <p className="font-semibold text-ms-navy">{message.senderName}</p>
                                      <p>{message.body}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4">
                                <p className="text-sm font-semibold text-ms-navy">Chronologie</p>
                                <div className="mt-2 space-y-2">
                                  {selectedMatterTimeline.slice(0, 3).map((entry) => (
                                    <div key={`${entry.title}-${entry.timestamp}`} className="rounded-xl border border-ms-navy/10 bg-white p-2 text-sm text-ms-ink/80">
                                      <p className="font-semibold text-ms-navy">{entry.title}</p>
                                      <p>{entry.detail}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {activeMatterTab === "clients" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Clients et participants</p>
                              <p className="mt-2">Client principal : {selectedMatter.client.fullName}</p>
                              <p className="mt-1">Participants : {(selectedMatter.participants ?? []).map((entry) => entry.client.fullName).join(", ") || "Aucun participant supplémentaire"}</p>
                            </div>
                          ) : null}
                          {activeMatterTab === "documents" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Gestion documentaire</p>
                              <p className="mt-2">Recherche, catégories, versions et aperçu PDF seront disponibles ici avec les pièces du dossier.</p>
                              <div className="mt-3 space-y-2">
                                {[
                                  { title: "Dossier technique", meta: "PDF · Version 3" },
                                  { title: "Correspondance client", meta: "Word · Version 1" },
                                  { title: "Pièces justificatives", meta: "Image · Version 2" },
                                ].map((document) => (
                                  <div key={document.title} className="rounded-xl border border-ms-navy/10 bg-white p-3">
                                    <p className="font-semibold text-ms-navy">{document.title}</p>
                                    <p className="text-sm text-ms-ink/70">{document.meta}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {activeMatterTab === "contracts" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Contrats et engagements</p>
                              <p className="mt-2">Le module réunit les contrats, annexes et signatures à traiter directement depuis le dossier.</p>
                            </div>
                          ) : null}
                          {activeMatterTab === "billing" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Facturation associée</p>
                              {selectedMatterInvoices.length === 0 ? <p className="mt-2">Aucune facture liée à ce dossier.</p> : selectedMatterInvoices.map((invoice) => <p key={invoice.id} className="mt-2">{invoice.invoiceNumber} · {formatEurAmount(invoice.total)} · {invoice.status}</p>)}
                            </div>
                          ) : null}
                          {activeMatterTab === "tasks" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Tâches assignées</p>
                              <div className="mt-3 space-y-2">
                                {selectedMatterTasks.map((task) => (
                                  <div key={task.id} className="rounded-xl border border-ms-navy/10 bg-white p-3">
                                    <p className="font-semibold text-ms-navy">{task.title}</p>
                                    <p className="text-sm text-ms-ink/70">{task.description ?? "Aucune description"}</p>
                                    <p className="mt-2 text-xs text-ms-navy-soft">Échéance : {task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-FR") : "Aucune"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {activeMatterTab === "calendar" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Calendrier du dossier</p>
                              <p className="mt-2">Planning des rendez-vous, audiences et relances à venir.</p>
                            </div>
                          ) : null}
                          {activeMatterTab === "messaging" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Messagerie</p>
                              <div className="mt-3 space-y-2">
                                {matterMessages.map((message) => (
                                  <div key={message.id} className="rounded-xl border border-ms-navy/10 bg-white p-3">
                                    <p className="font-semibold text-ms-navy">{message.senderName}</p>
                                    <p className="mt-1">{message.body}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {activeMatterTab === "activity" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Journal d’activité</p>
                              <div className="mt-3 space-y-2">{selectedMatterTimeline.map((entry) => <div key={`${entry.title}-${entry.timestamp}`} className="rounded-xl border border-ms-navy/10 bg-white p-3"><p className="font-semibold text-ms-navy">{entry.title}</p><p className="text-sm text-ms-ink/70">{entry.detail}</p></div>)}</div>
                            </div>
                          ) : null}
                          {activeMatterTab === "history" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Historique de suivi</p>
                              <p className="mt-2">Chaque action est maintenant visible dans un flux métier structuré et prêt à l’exploitation.</p>
                            </div>
                          ) : null}
                          {activeMatterTab === "notes" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Notes internes</p>
                              <p className="mt-2">Ajoutez ici les observations exclusives à l’équipe sans exposer d’informations sensibles au client.</p>
                            </div>
                          ) : null}
                          {activeMatterTab === "pieces" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Pièces jointes</p>
                              <p className="mt-2">Liste centralisée des pièces, documents et annexes liées au dossier.</p>
                            </div>
                          ) : null}
                          {activeMatterTab === "signatures" ? (
                            <div className="rounded-2xl border border-ms-navy/10 bg-ms-cream/40 p-4 text-sm text-ms-ink/80">
                              <p className="font-semibold text-ms-navy">Signatures en attente</p>
                              <p className="mt-2">Le workflow de signature sera visible ici avec l’état de chaque document.</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </SectionBlock>
              ) : null}

              {showBilling ? <SectionBlock title="Facturation" subtitle="Studio de facturation premium, calculs instantanés et actions pilotées">
                <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-slate-100 shadow-[0_25px_70px_-30px_rgba(15,23,42,0.95)] md:p-7">
                  <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
                  <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
                  <div className="relative space-y-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/85">Billing Studio</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">Pilotage intelligent de la facturation</h3>
                        <p className="mt-2 max-w-3xl text-sm text-slate-300/90">Créez, suivez et signez vos factures dans une interface orientée production: tableur éditorial, actions contextuelles, tri dynamique et aperçu financier en temps réel.</p>
                      </div>
                      <div className="rounded-2xl border border-slate-600/70 bg-slate-900/70 px-4 py-3 text-right backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Portefeuille actif</p>
                        <p className="mt-1 text-xl font-semibold text-slate-50">{invoices.length} facture(s)</p>
                        <p className="text-xs text-slate-400">Cycle {new Date().getFullYear()}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <article className="rounded-2xl border border-slate-600/70 bg-slate-900/70 p-4 backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Revenus encaissés</p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatEurAmount(billingRevenue)}</p>
                        <p className="text-xs text-slate-400">{billingPaidCount} facture(s) payée(s)</p>
                      </article>
                      <article className="rounded-2xl border border-slate-600/70 bg-slate-900/70 p-4 backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Encours à recouvrer</p>
                        <p className="mt-2 text-2xl font-semibold text-amber-300">{formatEurAmount(billingUnpaidTotal)}</p>
                        <p className="text-xs text-slate-400">{billingPendingCount} facture(s) en suivi</p>
                      </article>
                      <article className="rounded-2xl border border-slate-600/70 bg-slate-900/70 p-4 backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">À signer</p>
                        <p className="mt-2 text-2xl font-semibold text-cyan-200">{billingToSignCount}</p>
                        <p className="text-xs text-slate-400">Documents en attente</p>
                      </article>
                      <article className="rounded-2xl border border-slate-600/70 bg-slate-900/70 p-4 backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Panier en cours</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-50">{formatEurAmount(invoiceDraftSummary.ttc)}</p>
                        <p className="text-xs text-slate-400">TTC brouillon actif</p>
                      </article>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.7fr,0.9fr]">
                      <form id="law-firm-invoice-form" className="rounded-2xl border border-slate-600/70 bg-slate-900/65 p-4 backdrop-blur md:p-5" onSubmit={createInvoice}>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-100">{editingInvoiceId ? "Édition de facture" : "Nouvelle facture"}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button type="button" className="rounded-full border border-slate-500/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200" onClick={addInvoiceLine}>Ajouter une ligne</button>
                            {editingInvoiceId ? <button type="button" className="rounded-full border border-slate-500/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-amber-300 hover:text-amber-200" onClick={resetInvoiceForm}>Annuler l'édition</button> : null}
                            <button type="submit" disabled={invoiceFormSaving} className="rounded-full bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{invoiceFormSaving ? "Enregistrement..." : editingInvoiceId ? "Enregistrer" : "Créer la facture"}</button>
                          </div>
                        </div>

                        <div className="mb-4 grid gap-3 md:grid-cols-2">
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>Dossier</span>
                            <select value={invoiceForm.matterId} onChange={(event) => syncInvoiceMatter(event.target.value)} className="w-full rounded-xl border border-slate-500/70 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" required>
                              <option value="">Sélectionner un dossier</option>
                              {matters.filter((matter) => !matter.isArchived).map((matter) => (
                                <option key={matter.id} value={matter.id}>{matter.matterNumber} - {matter.title}</option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>Échéance</span>
                            <input type="date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="w-full rounded-xl border border-slate-500/70 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
                          </label>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-600/70">
                          <table className="min-w-[980px] w-full text-left text-xs">
                            <thead className="bg-slate-800/90 text-slate-300">
                              <tr>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Prestation</th>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Description</th>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Qté</th>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">PU HT</th>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Remise %</th>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">TVA %</th>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Montant HT</th>
                                <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoiceForm.lines.map((line, index) => {
                                const lineQuantity = Number(line.quantity) || 0;
                                const lineUnitPrice = Number(line.unitPrice) || 0;
                                const lineDiscount = Number(line.discount) || 0;
                                const lineTotal = Math.max(0, lineQuantity * lineUnitPrice * (1 - lineDiscount / 100));

                                return (
                                  <tr key={`line-${index}`} className="border-t border-slate-700/80 bg-slate-950/35 text-slate-100">
                                    <td className="px-3 py-2 align-top">
                                      <select value={line.pricingItemId} onChange={(event) => updateInvoiceLine(index, "pricingItemId", event.target.value)} className="w-full rounded-lg border border-slate-500/70 bg-slate-900/85 px-2 py-2 text-xs text-slate-100">
                                        <option value="">Prestation libre</option>
                                        {pricingCatalog.map((item) => (
                                          <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      <input value={line.description} onChange={(event) => updateInvoiceLine(index, "description", event.target.value)} placeholder="Description de ligne" className="w-full rounded-lg border border-slate-500/70 bg-slate-900/85 px-2 py-2 text-xs text-slate-100" />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      <input type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => updateInvoiceLine(index, "quantity", event.target.value)} className="w-[88px] rounded-lg border border-slate-500/70 bg-slate-900/85 px-2 py-2 text-xs text-slate-100" />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateInvoiceLine(index, "unitPrice", event.target.value)} className="w-[110px] rounded-lg border border-slate-500/70 bg-slate-900/85 px-2 py-2 text-xs text-slate-100" />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      <input type="number" min="0" max="100" step="0.01" value={line.discount} onChange={(event) => updateInvoiceLine(index, "discount", event.target.value)} className="w-[92px] rounded-lg border border-slate-500/70 bg-slate-900/85 px-2 py-2 text-xs text-slate-100" />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      <input type="number" min="0" max="100" step="0.01" value={line.vatRate} onChange={(event) => updateInvoiceLine(index, "vatRate", event.target.value)} className="w-[92px] rounded-lg border border-slate-500/70 bg-slate-900/85 px-2 py-2 text-xs text-slate-100" />
                                    </td>
                                    <td className="px-3 py-2 align-top text-sm font-semibold text-cyan-200">{formatEurAmount(lineTotal)}</td>
                                    <td className="px-3 py-2 align-top">
                                      <button type="button" className="rounded-lg border border-rose-300/60 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20" onClick={() => removeInvoiceLine(index)}>Retirer</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </form>

                      <aside className="rounded-2xl border border-slate-600/70 bg-slate-900/75 p-5 backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Récapitulatif instantané</p>
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 text-sm text-slate-300">
                            <span>Total HT</span>
                            <strong className="text-slate-100">{formatEurAmount(invoiceDraftSummary.ht)}</strong>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 text-sm text-slate-300">
                            <span>TVA</span>
                            <strong className="text-slate-100">{formatEurAmount(invoiceDraftSummary.vat)}</strong>
                          </div>
                          <div className="flex items-center justify-between text-base font-semibold text-cyan-200">
                            <span>Total TTC</span>
                            <strong>{formatEurAmount(invoiceDraftSummary.ttc)}</strong>
                          </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-700/80 bg-slate-950/60 p-4 text-xs text-slate-300">
                          <p className="font-semibold uppercase tracking-[0.14em] text-slate-200">Qualité de facturation</p>
                          <ul className="mt-2 space-y-1">
                            <li>Contrôlez les remises ligne par ligne avant émission.</li>
                            <li>Ajustez les taux de TVA selon la nature de prestation.</li>
                            <li>Vérifiez l'équilibre HT/TVA/TTC avant envoi client.</li>
                          </ul>
                        </div>
                      </aside>
                    </div>

                    <div className="rounded-2xl border border-slate-600/70 bg-slate-900/70 p-4 backdrop-blur">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">Portefeuille de factures</p>
                          <p className="text-xs text-slate-400">Recherche, filtres, tri et modes d'affichage</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-slate-600/80 bg-slate-950/70 p-1 text-xs">
                          <button type="button" onClick={() => setBillingView("CARDS")} className={`rounded-full px-3 py-1.5 font-semibold transition ${billingView === "CARDS" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:text-slate-100"}`}>Cartes</button>
                          <button type="button" onClick={() => setBillingView("LIST")} className={`rounded-full px-3 py-1.5 font-semibold transition ${billingView === "LIST" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:text-slate-100"}`}>Liste</button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-[1fr,220px,200px]">
                        <input value={billingSearch} onChange={(event) => setBillingSearch(event.target.value)} placeholder="Rechercher: numéro, client, dossier" className="rounded-xl border border-slate-500/70 bg-slate-950/85 px-3 py-2 text-sm text-slate-100" />
                        <select value={billingStatusFilter} onChange={(event) => setBillingStatusFilter(event.target.value as typeof billingStatusFilter)} className="rounded-xl border border-slate-500/70 bg-slate-950/85 px-3 py-2 text-sm text-slate-100">
                          <option value="ALL">Tous les statuts</option>
                          <option value="PAID">Payées</option>
                          <option value="PENDING">En attente</option>
                          <option value="TO_SIGN">À signer</option>
                          <option value="CANCELED">Annulées</option>
                          <option value="ARCHIVED">Archivées</option>
                        </select>
                        <select value={billingSort} onChange={(event) => setBillingSort(event.target.value as typeof billingSort)} className="rounded-xl border border-slate-500/70 bg-slate-950/85 px-3 py-2 text-sm text-slate-100">
                          <option value="RECENT">Plus récentes</option>
                          <option value="AMOUNT_DESC">Montant décroissant</option>
                          <option value="AMOUNT_ASC">Montant croissant</option>
                        </select>
                      </div>

                      <div className="mt-5">
                        {paginatedInvoices.length === 0 ? <p className="rounded-xl border border-slate-600/70 bg-slate-950/65 px-4 py-6 text-center text-sm text-slate-300">Aucune facture ne correspond aux filtres actifs.</p> : null}

                        {billingView === "CARDS" ? (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {paginatedInvoices.map((invoice) => {
                              const status = billingStatusMeta(invoice.status);
                              const isActive = selectedInvoiceId === invoice.id;

                              return (
                                <article key={invoice.id} className={`rounded-2xl border p-4 transition ${isActive ? "border-cyan-300/80 bg-slate-900/95" : "border-slate-600/80 bg-slate-950/65 hover:border-cyan-300/50"}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <button type="button" className="text-left" onClick={() => setSelectedInvoiceId(invoice.id)}>
                                      <p className="text-sm font-semibold text-slate-100">{invoice.invoiceNumber}</p>
                                      <p className="text-xs text-slate-400">{invoice.client.fullName}</p>
                                      <p className="text-xs text-slate-500">{invoice.matter.matterNumber} - {invoice.matter.title}</p>
                                    </button>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${billingStatusToneClass(status.tone)}`}>{status.label}</span>
                                  </div>
                                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <p className="text-slate-500">Échéance</p>
                                      <p className="font-medium text-slate-200">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : "Non définie"}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Montant</p>
                                      <p className="font-semibold text-cyan-200">{formatEurAmount(Number(invoice.total || 0))}</p>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                                    <button type="button" onClick={() => setSelectedInvoiceId(invoice.id)} className="rounded-full border border-slate-500/80 px-3 py-1.5 font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200">Ouvrir</button>
                                    <div className="relative">
                                      <button type="button" onClick={() => setOpenInvoiceActionMenuId((prev) => (prev === invoice.id ? null : invoice.id))} className="rounded-full border border-slate-500/80 px-3 py-1.5 font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200">Actions</button>
                                      {openInvoiceActionMenuId === invoice.id ? (
                                        <div className="absolute right-0 top-10 z-20 w-52 space-y-1 rounded-xl border border-slate-600/80 bg-slate-900 p-2 shadow-xl">
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => editInvoice(invoice)}>Modifier</button>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void invoiceAction(invoice.id, "send")}>Envoyer</button>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void signInvoice(invoice.id)}>Signer</button>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void invoiceAction(invoice.id, "duplicate")}>Dupliquer</button>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void invoiceAction(invoice.id, "archive")}>Archiver</button>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void invoiceAction(invoice.id, "mark_paid")}>Marquer payée</button>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void invoiceAction(invoice.id, "cancel")}>Annuler</button>
                                          <a className="block w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" href={`/api/law-firm/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">Prévisualiser PDF</a>
                                          <a className="block w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" href={`/api/law-firm/invoices/${invoice.id}/pdf?download=1`} target="_blank" rel="noreferrer">Télécharger PDF</a>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void createShareLink(invoice.id)}>Lien sécurisé</button>
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" onClick={() => void revokeShareLink(invoice.id)}>Révoquer lien</button>
                                          <a className="block w-full rounded-lg px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800" href={`/cabinet/espace/signature/${invoice.id}`}>Consulter et signer</a>
                                          <div className="my-1 border-t border-slate-700" />
                                          <button type="button" className="w-full rounded-lg px-3 py-1.5 text-left text-rose-300 hover:bg-rose-500/20" onClick={() => void invoiceAction(invoice.id, "delete")}>Supprimer</button>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-600/80">
                            <table className="w-full min-w-[860px] text-left text-xs text-slate-300">
                              <thead className="bg-slate-800/90">
                                <tr>
                                  <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Facture</th>
                                  <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Client</th>
                                  <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Dossier</th>
                                  <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Échéance</th>
                                  <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Montant</th>
                                  <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Statut</th>
                                  <th className="px-3 py-3 font-semibold uppercase tracking-[0.16em]">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedInvoices.map((invoice) => {
                                  const status = billingStatusMeta(invoice.status);

                                  return (
                                    <tr key={invoice.id} className={`border-t border-slate-700/80 ${selectedInvoiceId === invoice.id ? "bg-slate-800/70" : "bg-slate-950/50"}`}>
                                      <td className="px-3 py-3 font-semibold text-slate-100">{invoice.invoiceNumber}</td>
                                      <td className="px-3 py-3">{invoice.client.fullName}</td>
                                      <td className="px-3 py-3">{invoice.matter.matterNumber}</td>
                                      <td className="px-3 py-3">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : "-"}</td>
                                      <td className="px-3 py-3 text-cyan-200">{formatEurAmount(Number(invoice.total || 0))}</td>
                                      <td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${billingStatusToneClass(status.tone)}`}>{status.label}</span></td>
                                      <td className="px-3 py-3">
                                        <div className="flex flex-wrap gap-2">
                                          <button type="button" className="rounded-full border border-slate-500/80 px-2.5 py-1 text-slate-200 hover:border-cyan-300" onClick={() => setSelectedInvoiceId(invoice.id)}>Ouvrir</button>
                                          <button type="button" className="rounded-full border border-slate-500/80 px-2.5 py-1 text-slate-200 hover:border-cyan-300" onClick={() => editInvoice(invoice)}>Modifier</button>
                                          <button type="button" className="rounded-full border border-slate-500/80 px-2.5 py-1 text-slate-200 hover:border-cyan-300" onClick={() => void invoiceAction(invoice.id, "send")}>Envoyer</button>
                                          <button type="button" className="rounded-full border border-slate-500/80 px-2.5 py-1 text-slate-200 hover:border-cyan-300" onClick={() => void invoiceAction(invoice.id, "mark_paid")}>Payée</button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                        <p>Affichage {filteredInvoices.length === 0 ? 0 : (billingPage - 1) * billingPageSize + 1}-{Math.min(filteredInvoices.length, billingPage * billingPageSize)} sur {filteredInvoices.length}</p>
                        <div className="flex items-center gap-2">
                          <button type="button" disabled={billingPage <= 1} onClick={() => setBillingPage((page) => Math.max(1, page - 1))} className="rounded-full border border-slate-500/80 px-3 py-1.5 font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-45">Précédent</button>
                          <span>Page {billingPage} / {billingTotalPages}</span>
                          <button type="button" disabled={billingPage >= billingTotalPages} onClick={() => setBillingPage((page) => Math.min(billingTotalPages, page + 1))} className="rounded-full border border-slate-500/80 px-3 py-1.5 font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-45">Suivant</button>
                        </div>
                      </div>
                    </div>

                    {selectedInvoice ? (
                      <div className="rounded-2xl border border-slate-600/70 bg-slate-900/70 p-4 text-sm text-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-100">{selectedInvoice.invoiceNumber}</p>
                            <p className="text-xs text-slate-400">{selectedInvoice.client.fullName} - {selectedInvoice.client.email}</p>
                          </div>
                          <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{selectedInvoice.lines.length} ligne(s)</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                          <p className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2">Dossier: {selectedInvoice.matter.matterNumber}</p>
                          <p className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2">Total: {formatEurAmount(Number(selectedInvoice.total || 0))}</p>
                          <p className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2">Échéance: {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString("fr-FR") : "Non définie"}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </SectionBlock> : null}
            </div>
          </section>
        ) : null}

        {showClients ? (
          <SectionBlock title="Clients" subtitle="Annuaire client partageable avec recherche rapide">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {matterClients.map((client) => (
                <article key={client.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4 text-sm">
                  <p className="font-semibold text-ms-navy">{client.fullName}</p>
                  <p className="text-xs text-ms-ink/70">{client.email}</p>
                  <p className="mt-1 text-xs text-ms-ink/70">ID citoyen: {client.citizenUniqueId ?? "Non renseigné"}</p>
                </article>
              ))}
            </div>
          </SectionBlock>
        ) : null}

        {showDocuments ? (
          <div id="law-firm-documents">
            <SectionBlock title="Documents" subtitle="Accès au générateur et aux documents générés">
              <DocumentTemplateManager onStatus={setStatusMessage} />
            </SectionBlock>
          </div>
        ) : null}

        {showTasks ? (
          <div id="law-firm-tasks">
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
          </div>
        ) : null}

        {showDashboard ? (
          <SectionBlock title="Activité récente" subtitle="Derniers événements du workspace">
            <div className="space-y-2 text-sm">
              {dashboard?.recentActivity?.map((item) => <p key={`${item.kind}-${item.id}`} className="rounded-xl border border-ms-navy/10 bg-white px-4 py-3">{item.kind} - {item.title}</p>)}
            </div>
          </SectionBlock>
        ) : null}

        {showDashboard ? (
          <SectionBlock title="Agenda" subtitle="Échéances à venir">
            <div className="space-y-2 text-sm">
              {(dashboard?.agenda ?? []).length === 0 ? <p className="rounded-xl border border-ms-navy/10 bg-white px-4 py-3 text-ms-ink/70">Aucune échéance enregistrée.</p> : null}
              {(dashboard?.agenda ?? []).map((task) => (
                <p key={task.id} className="rounded-xl border border-ms-navy/10 bg-white px-4 py-3">
                  {task.matter.matterNumber} - {task.title} - {task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-FR") : "Sans date"}
                </p>
              ))}
            </div>
          </SectionBlock>
        ) : null}

        {showLibrary ? <SectionBlock title="Bibliothèque" subtitle="Ressources juridiques partagées"><p className="text-sm text-ms-ink/70">Module prêt pour l&apos;indexation documentaire et la recherche de jurisprudence.</p></SectionBlock> : null}
        {showTrainings ? <SectionBlock title="Formations" subtitle="Parcours de montée en compétence"><p className="text-sm text-ms-ink/70">Module prêt pour le suivi des formations internes et externes.</p></SectionBlock> : null}
        {showBarExam ? <SectionBlock title="Examen Barreau" subtitle="Préparation et évaluations"><p className="text-sm text-ms-ink/70">Module prêt pour les sessions d&apos;examens et simulations.</p></SectionBlock> : null}
        {showDisciplinary ? <SectionBlock title="Disciplinaire" subtitle="Suivi conformité et procédures"><p className="text-sm text-ms-ink/70">Module prêt pour le traitement des dossiers disciplinaires.</p></SectionBlock> : null}
        {showProfile ? <SectionBlock title="Mon espace" subtitle="Profil et préférences"><div className="grid gap-2 text-sm text-ms-ink/80"><p>Nom: {session?.user?.name ?? "Non renseigné"}</p><p>Email: {session?.user?.email ?? "Non renseigné"}</p></div></SectionBlock> : null}
      </div>
    </main>
  );
}
