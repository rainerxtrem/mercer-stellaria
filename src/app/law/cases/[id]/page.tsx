"use client";

import { ModulePermissionGuard } from "@/components/navigation/module-permission-guard";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

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
  participants?: Array<{ client: { id: string; fullName: string; email: string; citizenUniqueId?: string | null } }>;
  createdBy?: { fullName: string };
  updatedBy?: { fullName: string };
  tasks?: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
  messages?: Array<{ id: string; body: string; senderName: string; createdAt: string }>;
  documents?: Array<{ id: string; title: string; documentNumber: string; createdAt: string }>;
  invoices?: Array<{ id: string; invoiceNumber: string; status: string; total: number | null; updatedAt: string }>;
};

const statusMeta: Record<Matter["status"], { label: string; tone: string }> = {
  IN_PROGRESS: { label: "En cours", tone: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  PENDING: { label: "En attente", tone: "bg-amber-100 text-amber-700 border-amber-200" },
  HOLD: { label: "En instance", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  CLOSED: { label: "Clôturé", tone: "bg-violet-100 text-violet-700 border-violet-200" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function LawCaseDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matter, setMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadMatter() {
      setLoading(true);
      const response = await fetch(`/api/law-firm/matters?matterId=${encodeURIComponent(params.id)}`);
      if (!isActive) return;
      if (!response.ok) {
        setMatter(null);
        setLoading(false);
        return;
      }

      const payload = await response.json();
      const matters = (payload.data ?? []) as Matter[];
      const next = matters.find((entry) => entry.id === params.id) ?? null;
      setMatter(next);
      setLoading(false);
    }

    void loadMatter();
    return () => {
      isActive = false;
    };
  }, [params.id]);

  const backHref = useMemo(() => {
    const query = searchParams.toString();
    return `/law/cases${query ? `?${query}` : ""}`;
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-700 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          Chargement du dossier...
        </div>
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-700 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Introuvable</p>
          <h1 className="text-2xl font-semibold text-slate-900">Ce dossier n’est plus disponible.</h1>
          <button type="button" onClick={() => router.push(backHref)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Retour aux dossiers
          </button>
        </div>
      </div>
    );
  }

  const status = statusMeta[matter.status];
  const participants = matter.participants ?? [];
  const openTasks = (matter.tasks ?? []).filter((task) => task.status !== "DONE");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.04),_transparent_35%)] px-4 py-4 text-slate-800 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <button type="button" onClick={() => router.push(backHref)} className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                ← Retour aux dossiers
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Dossier</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{matter.title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{matter.summary ?? "Résumé à compléter pour mieux piloter le dossier."}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">{matter.matterNumber}</span>
              <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${status.tone}`}>{status.label}</span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Vue générale</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Informations clés</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">Pilotage</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Client principal</p>
                  <p className="mt-2 font-semibold text-slate-900">{matter.client.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">{matter.client.email}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Créé le</p>
                  <p className="mt-2 font-semibold text-slate-900">{formatDate(matter.createdAt)}</p>
                  <p className="mt-1 text-sm text-slate-600">Par {matter.createdBy?.fullName ?? "l’équipe"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dernière activité</p>
                  <p className="mt-2 font-semibold text-slate-900">{formatDateTime(matter.lastActivityAt)}</p>
                  <p className="mt-1 text-sm text-slate-600">Mis à jour par {matter.updatedBy?.fullName ?? "l’équipe"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Clients associés</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Parties impliquées</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {[{ ...matter.client, role: "Client principal" }, ...participants.map((entry) => ({ ...entry.client, role: "Partenaire" }))].map((person) => (
                  <div key={person.id} className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{person.fullName}</p>
                      <p className="text-sm text-slate-600">{person.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{person.role}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Messagerie</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Derniers échanges</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {(matter.messages ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Aucun échange enregistré pour le moment.</div>
                ) : (
                  matter.messages?.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{message.senderName}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(message.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{message.body}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Tâches</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Actions à venir</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {openTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Aucune tâche ouverte.</div>
                ) : (
                  openTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-600">Échéance {formatDate(task.dueDate)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Documents</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Pièces jointes</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {(matter.documents ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Aucun document disponible.</div>
                ) : (
                  matter.documents?.map((document) => (
                    <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{document.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{document.documentNumber} • {formatDate(document.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Facturation</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Factures liées</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {(matter.invoices ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Aucune facture associée.</div>
                ) : (
                  matter.invoices?.map((invoice) => (
                    <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-sm text-slate-600">{invoice.status} • {invoice.total ? `${invoice.total.toFixed(2)} €` : "—"}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LawCaseDetailPage() {
  return (
    <ModulePermissionGuard permission="module:law_firm.cases">
      <Suspense fallback={<div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-700 lg:px-8"><div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">Chargement du dossier...</div></div>}>
        <LawCaseDetailContent />
      </Suspense>
    </ModulePermissionGuard>
  );
}
