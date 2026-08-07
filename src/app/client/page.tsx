"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { SectionBlock } from "@/components/dashboard/section-block";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SignaturePad } from "@/components/signature/signature-pad";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getClaimStatusLabel,
  getContractStatusLabel,
  getInvoiceStatusLabel,
  getSubscriptionRequestStatusLabel,
} from "@/lib/status-mapping";

type Contract = {
  id: string;
  contractNumber: string;
  formulaName: string;
  status: string;
  weeklyPremium: string | number;
  pdfUrl: string | null;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  amount: string | number;
  status: string;
};

type Claim = {
  id: string;
  claimNumber: string;
  contractId: string | null;
  incidentType: string;
  description: string;
  evidenceLink: string | null;
  lspdReportLink: string | null;
  incidentDate: string;
  status: string;
  requestedAmount: string | number | null;
  declaredAt: string;
};

type SubscriptionRequest = {
  id: string;
  requestNumber: string;
  type: "NEW_SUBSCRIPTION" | "UPGRADE";
  requestedFormula: string;
  status: string;
  advisorValidated: boolean;
};

type ClaimMessage = {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  documentLink: string | null;
  createdAt: string;
};

type ContactMessage = {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  documentLink: string | null;
  createdAt: string;
};

type AppNotification = {
  id: string;
  type: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type ClientTab = "OVERVIEW" | "CONTRACTS" | "CLAIMS" | "MESSAGES" | "REQUESTS" | "BILLING";

const clientTabs: Array<{ id: ClientTab; label: string }> = [
  { id: "OVERVIEW", label: "Vue d'ensemble" },
  { id: "CONTRACTS", label: "Contrats" },
  { id: "CLAIMS", label: "Dossiers sinistres" },
  { id: "MESSAGES", label: "Contact conseiller" },
  { id: "REQUESTS", label: "Souscriptions" },
  { id: "BILLING", label: "Facturation" },
];

type ArchivedContactConversation = {
  id: string;
  conversationId: string;
  openedAt: string;
  closedAt: string | null;
  handledByName: string | null;
  closureReason: string | null;
  closedByName: string | null;
  closedByRole: string | null;
  messages: ContactMessage[];
};

function formatSenderRole(role: string) {
  if (role === "ADMIN") {
    return "Direction";
  }

  if (role === "COLLABORATOR") {
    return "Collaborateur";
  }

  if (role === "CLIENT") {
    return "Client";
  }

  return role;
}

function getClaimJourney(status: string) {
  if (status === "SUBMITTED") {
    return { step: "1/5 Déclaration reçue", nextAction: "Aucune action requise. Analyse conseiller en cours." };
  }

  if (status === "UNDER_REVIEW") {
    return { step: "2/5 Analyse en cours", nextAction: "Aucune action requise. Préparez les pièces justificatives si demandées." };
  }

  if (status === "WAITING_DETAILS") {
    return { step: "3/5 Compléments demandés", nextAction: "Ouvrez le dossier et envoyez les compléments demandés." };
  }

  if (status === "APPROVED") {
    return { step: "4/5 Validé", nextAction: "Suivez le remboursement et la facturation associée." };
  }

  if (status === "PAID") {
    return { step: "5/5 Remboursé", nextAction: "Dossier clôturé. Historique disponible." };
  }

  if (status === "REJECTED") {
    return { step: "Décision rendue", nextAction: "Contactez un conseiller pour comprendre la décision." };
  }

  return { step: "En cours", nextAction: "Consultez le dossier pour les prochaines actions." };
}

export default function ClientPage() {
  const { data: session } = useSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ClientTab>("OVERVIEW");
  const [selectedContractId, setSelectedContractId] = useState("");
  const [signatureMethod, setSignatureMethod] = useState<"DRAWN_CANVAS" | "CERTIFIED_CLICK">("CERTIFIED_CLICK");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [openedComplementClaim, setOpenedComplementClaim] = useState<Claim | null>(null);
  const [openedMessagesClaim, setOpenedMessagesClaim] = useState<Claim | null>(null);
  const [claimMessages, setClaimMessages] = useState<ClaimMessage[]>([]);
  const [messageForm, setMessageForm] = useState({ body: "", documentLink: "" });
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [contactHistory, setContactHistory] = useState<ArchivedContactConversation[]>([]);
  const [contactForm, setContactForm] = useState({ body: "", documentLink: "" });
  const [hasUnreadAdvisorMessage, setHasUnreadAdvisorMessage] = useState(false);
  const [unreadAdvisorClaimsCount, setUnreadAdvisorClaimsCount] = useState(0);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);
  const [notificationFeed, setNotificationFeed] = useState<AppNotification[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [contactLoadedOnce, setContactLoadedOnce] = useState(false);
  const [contactConversationId, setContactConversationId] = useState<string | null>(null);
  const [closingContactConversation, setClosingContactConversation] = useState(false);
  const contactMessageIdsRef = useRef<string[]>([]);
  const newContactMessageAudioRef = useRef<HTMLAudioElement | null>(null);

  const [claimForm, setClaimForm] = useState({
    contractId: "",
    incidentType: "",
    description: "",
    evidenceLink: "",
    lspdReportLink: "",
    incidentDate: "",
    requestedAmount: "",
  });

  const [complementForm, setComplementForm] = useState({
    contractId: "",
    incidentType: "",
    description: "",
    evidenceLink: "",
    lspdReportLink: "",
    incidentDate: "",
    requestedAmount: "",
  });

  const [requestForm, setRequestForm] = useState({
    type: "NEW_SUBSCRIPTION" as "NEW_SUBSCRIPTION" | "UPGRADE",
    requestedCategory: "HEALTH" as "HEALTH",
    requestedFormula: "Care Plus",
    currentFormula: "",
    reason: "",
  });

  function notifySuccess(message: string) {
    setToast({ message, tone: "success" });
  }

  function notifyError(message: string) {
    setToast({ message, tone: "error" });
  }

  function playNewContactMessageSound() {
    try {
      if (!newContactMessageAudioRef.current) {
        newContactMessageAudioRef.current = new Audio("/son_nouveau_message05.mp3");
      }

      const audio = newContactMessageAudioRef.current;
      audio.currentTime = 0;
      void audio.play().catch(() => null);
    } catch {
      // Ignore audio errors (autoplay restrictions, unsupported format, etc.)
    }
  }

  async function extractErrorMessage(response: Response, fallback: string) {
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
      }

      if (payload?.error && typeof payload.error === "object") {
        const fieldErrors = payload.error.fieldErrors as Record<string, string[] | undefined> | undefined;
        if (fieldErrors) {
          const firstMessage = Object.values(fieldErrors).flat().find((value) => typeof value === "string" && value.trim());
          if (firstMessage) {
            return firstMessage;
          }
        }

        const formErrors = payload.error.formErrors as string[] | undefined;
        const firstFormError = formErrors?.find((value) => typeof value === "string" && value.trim());
        if (firstFormError) {
          return firstFormError;
        }
      }
    } catch {
      return fallback;
    }

    return fallback;
  }

  async function uploadAttachment(file: File, targetField: string, apply: (url: string) => void, scope: "claims" | "contact") {
    setUploadingField(targetField);
    try {
      const formData = new FormData();
      formData.append("scope", scope);
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        notifyError(await extractErrorMessage(response, "Upload impossible."));
        return;
      }

      const payload = await response.json();
      const uploadedUrl = payload?.data?.publicUrl;
      if (typeof uploadedUrl !== "string" || !uploadedUrl.trim()) {
        notifyError("Aucun lien de fichier n'a été renvoyé.");
        return;
      }

      apply(uploadedUrl);
      notifySuccess("Pièce jointe uploadée.");
    } finally {
      setUploadingField(null);
    }
  }

  const overview = useMemo(() => {
    const activeContracts = contracts.filter((item) => item.status === "ACTIVE").length;
    const pendingSignatures = contracts.filter((item) => item.status === "PENDING_SIGNATURE").length;
    const weeklyContribution = contracts.reduce((total, item) => total + Number(item.weeklyPremium), 0);
    const pendingRequests = requests.filter((item) => item.status === "REQUESTED" || item.status === "WAITING_MEETING" || item.status === "UNDER_REVIEW").length;
    return { activeContracts, pendingSignatures, weeklyContribution, pendingRequests };
  }, [contracts, requests]);

  const pendingComplementClaims = useMemo(
    () => claims.filter((claim) => claim.status === "WAITING_DETAILS"),
    [claims],
  );

  const showComplementAlert = pendingComplementClaims.length > 0;

  const firstPendingComplementClaim = useMemo(
    () => pendingComplementClaims[0] ?? null,
    [pendingComplementClaims],
  );

  const pendingSignatureContracts = useMemo(
    () => contracts.filter((contract) => contract.status === "PENDING_SIGNATURE"),
    [contracts],
  );

  const activeClaims = useMemo(
    () => claims.filter((claim) => claim.status === "SUBMITTED" || claim.status === "UNDER_REVIEW" || claim.status === "WAITING_DETAILS"),
    [claims],
  );

  async function loadData() {
    setLoading(true);
    const [contractsRes, invoicesRes, claimsRes, requestsRes, notificationsRes] = await Promise.all([
      fetch("/api/contracts?scope=self"),
      fetch("/api/invoices?scope=self"),
      fetch("/api/claims?scope=self"),
      fetch("/api/subscription-requests?scope=self"),
      fetch("/api/notifications"),
    ]);

    if (contractsRes.ok) {
      const json = await contractsRes.json();
      setContracts(json.data ?? []);
    }

    if (invoicesRes.ok) {
      const json = await invoicesRes.json();
      setInvoices(json.data ?? []);
    }

    if (claimsRes.ok) {
      const json = await claimsRes.json();
      const nextClaims: Claim[] = json.data ?? [];
      setClaims(nextClaims);
    }

    if (requestsRes.ok) {
      const json = await requestsRes.json();
      setRequests(json.data ?? []);
    }

    if (notificationsRes.ok) {
      const json = await notificationsRes.json();
      setHasUnreadAdvisorMessage(Boolean(json?.data?.hasUnread));
      setUnreadAdvisorClaimsCount(Number(json?.data?.unreadClaimsCount ?? 0));
      setFeedUnreadCount(Number(json?.data?.feedUnreadCount ?? 0));
      setNotificationFeed(Array.isArray(json?.data?.notifications) ? json.data.notifications : []);
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch(() => notifyError("Impossible de charger vos données."));
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function markNotificationsAsRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });

    if (!response.ok) {
      notifyError("Impossible de marquer les notifications comme lues.");
      return;
    }

    setNotificationFeed((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setFeedUnreadCount(0);
    notifySuccess("Notifications marquées comme lues.");
  }

  useEffect(() => {
    if (activeTab !== "MESSAGES") {
      return;
    }

    loadGeneralContactMessages().catch(() => notifyError("Impossible de charger la conversation conseiller."));
    loadArchivedContactHistory().catch(() => notifyError("Impossible de charger l'historique des conversations."));
    const interval = window.setInterval(() => {
      loadGeneralContactMessages().catch(() => null);
    }, 2500);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, session?.user?.id]);

  useEffect(() => {
    if (!openedMessagesClaim) {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/claims/messages?claimId=${openedMessagesClaim.id}`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      setClaimMessages(payload.data ?? []);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [openedMessagesClaim?.id]);

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch("/api/subscription-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...requestForm,
        currentFormula: requestForm.currentFormula || undefined,
        reason: requestForm.reason || undefined,
      }),
    });

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible d'envoyer votre demande."));
      return;
    }

    setRequestForm({
      type: "NEW_SUBSCRIPTION",
      requestedCategory: "HEALTH",
      requestedFormula: "Care Plus",
      currentFormula: "",
      reason: "",
    });
    notifySuccess("Demande envoyée. Validation physique par un conseiller requise.");
    await loadData();
  }

  async function handleClaimSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...claimForm,
        requestedAmount: claimForm.requestedAmount || undefined,
      }),
    });

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "La declaration a echoue."));
      return;
    }

    setClaimForm({
      contractId: "",
      incidentType: "",
      description: "",
      evidenceLink: "",
      lspdReportLink: "",
      incidentDate: "",
      requestedAmount: "",
    });
    notifySuccess("Sinistre enregistre avec succes.");
    await loadData();
  }

  function openClaimForComplement(claim: Claim) {
    setOpenedComplementClaim(claim);
    setComplementForm({
      contractId: claim.contractId ?? "",
      incidentType: claim.incidentType,
      description: claim.description,
      evidenceLink: claim.evidenceLink ?? "",
      lspdReportLink: claim.lspdReportLink ?? "",
      incidentDate: claim.incidentDate ? new Date(claim.incidentDate).toISOString().slice(0, 10) : "",
      requestedAmount: claim.requestedAmount !== null ? String(claim.requestedAmount) : "",
    });
  }

  function closeComplementModal() {
    setOpenedComplementClaim(null);
    setComplementForm({
      contractId: "",
      incidentType: "",
      description: "",
      evidenceLink: "",
      lspdReportLink: "",
      incidentDate: "",
      requestedAmount: "",
    });
  }

  async function handleComplementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openedComplementClaim) {
      return;
    }

    const response = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claimId: openedComplementClaim.id,
        ...complementForm,
        requestedAmount: complementForm.requestedAmount || undefined,
      }),
    });

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible d'envoyer le complément demandé."));
      return;
    }

    closeComplementModal();
    notifySuccess("Complément envoyé. Le dossier repasse en cours d'analyse.");
    await loadData();
  }

  async function openClaimMessages(claim: Claim) {
    setOpenedMessagesClaim(claim);
    setMessageForm({ body: "", documentLink: "" });
    const response = await fetch(`/api/claims/messages?claimId=${claim.id}`);
    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible de charger la conversation."));
      setClaimMessages([]);
      return;
    }

    const payload = await response.json();
    setClaimMessages(payload.data ?? []);
    await loadData();
  }

  async function loadGeneralContactMessages() {
    const query = session?.user?.id ? `?clientId=${session.user.id}` : "";
    const response = await fetch(`/api/contact/messages${query}`);
    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible de charger la conversation conseiller."));
      setContactLoadedOnce(true);
      return;
    }

    const payload = await response.json();
    const nextMessages: ContactMessage[] = payload.data ?? [];
    const previousMessageIds = new Set(contactMessageIdsRef.current);
    const hasNewIncomingMessage = nextMessages.some(
      (message) => !previousMessageIds.has(message.id) && message.senderId !== session?.user?.id,
    );

    setContactMessages(nextMessages);
    contactMessageIdsRef.current = nextMessages.map((message) => message.id);

    if (contactLoadedOnce && hasNewIncomingMessage) {
      playNewContactMessageSound();
    }

    setContactConversationId(typeof payload?.meta?.conversationId === "string" ? payload.meta.conversationId : null);
    setContactLoadedOnce(true);
  }

  async function loadArchivedContactHistory() {
    const query = session?.user?.id ? `?clientId=${session.user.id}&history=1` : "?history=1";
    const response = await fetch(`/api/contact/messages${query}`);
    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible de charger l'historique des conversations."));
      return;
    }

    const payload = await response.json();
    setContactHistory(Array.isArray(payload?.data) ? payload.data : []);
  }

  async function sendGeneralContactMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/contact/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: session?.user?.id,
        body: contactForm.body,
        documentLink: contactForm.documentLink || undefined,
      }),
    });

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible d'envoyer le message au conseiller."));
      return;
    }

    setContactForm({ body: "", documentLink: "" });
    notifySuccess("Message envoyé au conseiller.");
    await loadGeneralContactMessages();
    await loadArchivedContactHistory();
  }

  async function closeGeneralContactConversation() {
    if (!contactConversationId) {
      notifyError("Aucune conversation active à clôturer.");
      return;
    }

    const reason = window.prompt("Motif de clôture (optionnel)")?.trim() ?? "";
    setClosingContactConversation(true);

    const response = await fetch(`/api/contact/messages?clientId=${session?.user?.id ?? ""}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined }),
    });

    setClosingContactConversation(false);

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible de clôturer la conversation."));
      return;
    }

    notifySuccess("Conversation archivée.");
    setContactMessages([]);
    setContactConversationId(null);
    await loadGeneralContactMessages();
    await loadArchivedContactHistory();
  }

  function closeClaimMessages() {
    setOpenedMessagesClaim(null);
    setClaimMessages([]);
    setMessageForm({ body: "", documentLink: "" });
  }

  async function sendClaimMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openedMessagesClaim) {
      return;
    }

    const response = await fetch("/api/claims/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claimId: openedMessagesClaim.id,
        body: messageForm.body,
        documentLink: messageForm.documentLink || undefined,
      }),
    });

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible d'envoyer le message."));
      return;
    }

    setMessageForm({ body: "", documentLink: "" });
    notifySuccess("Message envoyé.");
    await openClaimMessages(openedMessagesClaim);
  }

  async function signContract() {
    if (!selectedContractId) {
      notifyError("Selectionnez un contrat a signer.");
      return;
    }

    if (signatureMethod === "DRAWN_CANVAS" && !signatureData) {
      notifyError("Veuillez dessiner votre signature avant validation.");
      return;
    }

    const response = await fetch(`/api/contracts/${selectedContractId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: signatureMethod, signatureData }),
    });

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "La signature a echoue."));
      return;
    }

    notifySuccess("Contrat signe et PDF genere avec succes.");
    await loadData();
  }

  async function markInvoicePaid(invoiceId: string) {
    const response = await fetch("/api/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, action: "mark_paid" }),
    });

    if (!response.ok) {
      notifyError(await extractErrorMessage(response, "Impossible de marquer la facture comme payée."));
      return;
    }

    notifySuccess("Facture marquée comme payée.");
    await loadData();
  }

  return (
    <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
      <div className="workspace-grid mx-auto grid w-full max-w-7xl gap-6">
        {toast ? (
          <div className="fixed right-5 top-5 z-[70] w-full max-w-sm" aria-live="polite">
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
                toast.tone === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-red-300 bg-red-50 text-red-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p>{toast.message}</p>
                <button
                  type="button"
                  aria-label="Fermer la notification"
                  className="rounded-md px-1 py-0.5 text-xs font-bold opacity-70 hover:opacity-100"
                  onClick={() => setToast(null)}
                >
                  x
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <header className="workspace-hero">
          <p className="workspace-kicker">Espace Client</p>
          <h1 className="workspace-title">Tableau de bord</h1>
          <p className="workspace-subtitle">Souscription autonome, suivi des contrats et historique des sinistres.</p>
        </header>

        <nav className="surface tab-strip p-2" aria-label="Navigation espace client">
          {clientTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`tab-pill ${activeTab === tab.id ? "tab-pill-active" : ""}`}
            >
              {tab.id === "MESSAGES" && hasUnreadAdvisorMessage ? `🔔 ${tab.label}` : tab.label}
            </button>
          ))}
        </nav>

        {hasUnreadAdvisorMessage ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
            <p className="text-sm font-semibold">
              Nouveau message conseiller. Ouvrez l&apos;onglet Contact conseiller pour le consulter
              {unreadAdvisorClaimsCount > 0 ? ` (${unreadAdvisorClaimsCount} dossier(s) sinistre)` : ""}.
            </p>
          </div>
        ) : null}

        {showComplementAlert ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-red-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Complément demandé, merci de répondre à cette demande pour la suite de votre dossier.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (firstPendingComplementClaim) {
                    openClaimForComplement(firstPendingComplementClaim);
                  }
                }}
                className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700"
              >
                Ouvrir
              </button>
            </div>
          </div>
        ) : null}

        <div className="tab-panel">
        {activeTab === "OVERVIEW" ? (
          <>
            <MetricsGrid
              items={[
                { label: "Contrats actifs", value: String(overview.activeContracts) },
                { label: "Signatures en attente", value: String(overview.pendingSignatures) },
                { label: "Cotisation hebdomadaire", value: `${overview.weeklyContribution.toLocaleString("fr-FR")} $` },
                { label: "Demandes formule en cours", value: String(overview.pendingRequests) },
              ]}
            />

            <section className="mt-3 grid gap-8 lg:grid-cols-2">
              <SectionBlock title="Priorités" subtitle="Actions recommandées">
                <div className="space-y-3 text-sm text-ms-ink/85">
                  <p>Sinistres actifs: {activeClaims.length}</p>
                  <p>Compléments demandés: {pendingComplementClaims.length}</p>
                  <p>Contrats à signer: {pendingSignatureContracts.length}</p>
                </div>
              </SectionBlock>

              <SectionBlock title="Raccourcis" subtitle="Navigation rapide">
                <QuickActions
                  actions={[
                    { label: "Dossiers sinistres", onClick: () => setActiveTab("CLAIMS") },
                    { label: "Contacter un conseiller", onClick: () => setActiveTab("MESSAGES") },
                    { label: "Contrats", onClick: () => setActiveTab("CONTRACTS") },
                    { label: "Facturation", onClick: () => setActiveTab("BILLING") },
                  ]}
                />
              </SectionBlock>

              <SectionBlock
                title="Centre notifications"
                subtitle="Contrats, factures, messages et suivi"
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
                <div className="max-h-60 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-white p-3">
                  {notificationFeed.length === 0 ? (
                    <p className="text-sm text-ms-ink/65">Aucune notification pour le moment.</p>
                  ) : (
                    notificationFeed.slice(0, 8).map((item) => (
                      <article key={item.id} className={`rounded-lg border p-3 ${item.isRead ? "border-ms-navy/10 bg-ms-cream/40" : "border-ms-gold/35 bg-ms-gold/10"}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">{item.title}</p>
                        <p className="mt-1 text-sm text-ms-ink/85">{item.body}</p>
                        <p className="mt-1 text-xs text-ms-ink/60">{new Date(item.createdAt).toLocaleString("fr-FR")}</p>
                      </article>
                    ))
                  )}
                </div>
              </SectionBlock>
            </section>
          </>
        ) : null}

        {activeTab === "CONTRACTS" ? (
          <SectionBlock
            title="Contrats"
            subtitle="Visualisation, signature electronique et telechargement PDF"
            actions={<span className="text-sm text-ms-ink/70">{`${contracts.length} contrat(s)`}</span>}
          >
            <div className="space-y-3 md:hidden">
              {contracts.map((contract) => (
                <article key={contract.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ms-navy">{contract.contractNumber}</p>
                      <p className="text-xs text-ms-ink/70">{contract.formulaName}</p>
                    </div>
                    <StatusBadge {...getContractStatusLabel(contract.status)} />
                  </div>
                  <p className="mt-3 text-sm text-ms-ink/80">Prime: {contract.weeklyPremium} $ / semaine</p>
                  <div className="mt-4 grid gap-2">
                    {contract.status === "PENDING_SIGNATURE" ? (
                      <button
                        className="rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy"
                        onClick={() => setSelectedContractId(contract.id)}
                      >
                        Signer
                      </button>
                    ) : null}
                    {contract.pdfUrl ? (
                      <a className="rounded-xl bg-ms-navy px-3 py-2 text-center text-sm font-semibold text-white" href={contract.pdfUrl} target="_blank" rel="noreferrer">
                        Ouvrir le PDF
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-ms-navy-soft">
                  <tr>
                    <th className="pb-3">Numero</th>
                    <th className="pb-3">Formule</th>
                    <th className="pb-3">Prime / semaine</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="text-ms-ink/85">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="border-t border-ms-navy/10">
                      <td className="py-3">{contract.contractNumber}</td>
                      <td className="py-3">{contract.formulaName}</td>
                      <td className="py-3">{contract.weeklyPremium} $</td>
                      <td className="py-3">
                        <StatusBadge {...getContractStatusLabel(contract.status)} />
                      </td>
                      <td className="py-3 flex gap-2">
                        {contract.status === "PENDING_SIGNATURE" ? (
                          <button
                            className="rounded-lg border border-ms-navy/20 px-3 py-1.5 text-xs font-semibold text-ms-navy"
                            onClick={() => setSelectedContractId(contract.id)}
                          >
                            Signer
                          </button>
                        ) : null}
                        {contract.pdfUrl ? (
                          <a className="rounded-lg bg-ms-navy px-3 py-1.5 text-xs font-semibold text-white" href={contract.pdfUrl} target="_blank" rel="noreferrer">
                            PDF
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pendingSignatureContracts.length > 0 ? (
              <div className="mt-5 grid gap-3 rounded-xl border border-ms-navy/10 bg-white p-4">
                <p className="text-sm font-semibold text-ms-navy">Signature électronique</p>
                <select
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5 text-sm"
                  value={selectedContractId}
                  onChange={(event) => setSelectedContractId(event.target.value)}
                >
                  <option value="">Sélectionner un contrat en attente</option>
                  {pendingSignatureContracts.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.contractNumber} - {item.formulaName}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1.5 font-semibold ${signatureMethod === "CERTIFIED_CLICK" ? "bg-ms-navy text-white" : "border border-ms-navy/20 text-ms-navy"}`}
                    onClick={() => setSignatureMethod("CERTIFIED_CLICK")}
                  >
                    Signature certifiée par clic
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1.5 font-semibold ${signatureMethod === "DRAWN_CANVAS" ? "bg-ms-navy text-white" : "border border-ms-navy/20 text-ms-navy"}`}
                    onClick={() => setSignatureMethod("DRAWN_CANVAS")}
                  >
                    Signature dessinée
                  </button>
                </div>

                {signatureMethod === "DRAWN_CANVAS" ? <SignaturePad onSignatureChange={setSignatureData} /> : null}

                <button type="button" className="w-fit rounded-full bg-ms-navy px-4 py-2.5 text-sm font-semibold text-white" onClick={signContract}>
                  Valider la signature
                </button>
              </div>
            ) : null}
          </SectionBlock>
        ) : null}

        {activeTab === "REQUESTS" ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <SectionBlock title="Souscription & upgrade" subtitle="Demandez une formule en autonomie (validation physique requise)">
              <form className="grid gap-3 text-sm" onSubmit={handleRequestSubmit}>
              <select
                value={requestForm.type}
                onChange={(event) =>
                  setRequestForm((prev) => ({
                    ...prev,
                    type: event.target.value as "NEW_SUBSCRIPTION" | "UPGRADE",
                  }))
                }
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              >
                <option value="NEW_SUBSCRIPTION">Nouvelle souscription</option>
                <option value="UPGRADE">Demande d&apos;upgrade</option>
              </select>
              <select
                value={requestForm.requestedCategory}
                onChange={() => null}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                disabled
              >
                <option value="HEALTH">Santé</option>
              </select>
              <select
                required
                value={requestForm.requestedFormula}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, requestedFormula: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              >
                <option value="Essential Care">Essential Care</option>
                <option value="Care Plus">Care Plus</option>
                <option value="Care Max">Care Max</option>
              </select>
              <input
                value={requestForm.currentFormula}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, currentFormula: event.target.value }))}
                placeholder="Formule actuelle (si upgrade)"
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <textarea
                value={requestForm.reason}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, reason: event.target.value }))}
                rows={3}
                placeholder="Motif de la demande"
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <button type="submit" className="rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white">
                Envoyer ma demande
              </button>
            </form>
            </SectionBlock>

            <SectionBlock title="Historique demandes formule" subtitle="Souscriptions et upgrades soumis par vos soins">
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-ms-navy/10 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ms-navy">{request.requestNumber}</p>
                        <p className="text-xs text-ms-ink/70">
                          {request.type === "UPGRADE" ? "Upgrade" : "Souscription"} - {request.requestedFormula}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge {...getSubscriptionRequestStatusLabel(request.status)} />
                        <span className="text-xs text-ms-ink/70">{request.advisorValidated ? "Validée conseiller" : "Validation conseiller requise"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>
          </section>
        ) : null}

        {activeTab === "CLAIMS" ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <SectionBlock title="Declaration de sinistre" subtitle="Accident, vol, preuves et reference LSPD">
            <form className="grid gap-3 text-sm" onSubmit={handleClaimSubmit}>
              <select
                value={claimForm.contractId}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, contractId: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              >
                <option value="">Aucun contrat spécifique</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contractNumber}
                  </option>
                ))}
              </select>
              <input
                required
                value={claimForm.incidentType}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, incidentType: event.target.value }))}
                placeholder="Type de sinistre"
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <textarea
                required
                value={claimForm.description}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description détaillée"
                rows={4}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <input
                type="date"
                required
                value={claimForm.incidentDate}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, incidentDate: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <input
                value={claimForm.requestedAmount}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, requestedAmount: event.target.value }))}
                placeholder="Montant demandé (optionnel)"
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <input
                value={claimForm.evidenceLink}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, evidenceLink: event.target.value }))}
                placeholder="Lien de preuve"
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  void uploadAttachment(file, "claim-evidence", (url) => setClaimForm((prev) => ({ ...prev, evidenceLink: url })), "claims");
                }}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5 text-sm"
              />
              {uploadingField === "claim-evidence" ? <p className="text-xs text-ms-navy-soft">Upload en cours...</p> : null}
              <input
                value={claimForm.lspdReportLink}
                onChange={(event) => setClaimForm((prev) => ({ ...prev, lspdReportLink: event.target.value }))}
                placeholder="Lien plainte LSPD"
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
              <button type="submit" className="rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white">Envoyer le sinistre</button>
            </form>
            </SectionBlock>

            <SectionBlock title="Historique sinistres" subtitle="Demande, examen et décision visible en temps réel">
              <div className="space-y-3 md:hidden">
                {claims.map((claim) => {
                  const journey = getClaimJourney(claim.status);

                  return (
                    <article key={claim.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ms-navy">{claim.claimNumber}</p>
                          <p className="text-xs text-ms-ink/70">{claim.incidentType}</p>
                        </div>
                        <StatusBadge {...getClaimStatusLabel(claim.status)} />
                      </div>
                      <div className="mt-3 grid gap-1 text-sm text-ms-ink/80">
                        <p>Étape: {journey.step}</p>
                        <p>Prochaine action: {journey.nextAction}</p>
                        <p>Montant demandé: {claim.requestedAmount ?? "-"}</p>
                        <p>Date: {new Date(claim.declaredAt).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {claim.status === "WAITING_DETAILS" ? (
                          <button
                            type="button"
                            className="rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy"
                            onClick={() => openClaimForComplement(claim)}
                          >
                            Ouvrir le dossier
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy"
                          onClick={() => openClaimMessages(claim)}
                        >
                          Messages
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="text-ms-navy-soft">
                    <tr>
                      <th className="pb-3">Numéro</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3">Étape</th>
                      <th className="pb-3">Prochaine action</th>
                      <th className="pb-3">Montant demandé</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-ms-ink/85">
                    {claims.map((claim) => (
                      (() => {
                        const journey = getClaimJourney(claim.status);
                        return (
                      <tr key={claim.id} className="border-t border-ms-navy/10">
                        <td className="py-3">{claim.claimNumber}</td>
                        <td className="py-3">{claim.incidentType}</td>
                        <td className="py-3"><StatusBadge {...getClaimStatusLabel(claim.status)} /></td>
                        <td className="py-3 text-xs font-semibold text-ms-navy">{journey.step}</td>
                        <td className="py-3 text-xs text-ms-ink/75">{journey.nextAction}</td>
                        <td className="py-3">{claim.requestedAmount ?? "-"}</td>
                        <td className="py-3">{new Date(claim.declaredAt).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3">
                          {claim.status === "WAITING_DETAILS" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="rounded-md border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                                onClick={() => openClaimForComplement(claim)}
                              >
                                Ouvrir
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                                onClick={() => openClaimMessages(claim)}
                              >
                                Messages
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="rounded-md border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                              onClick={() => openClaimMessages(claim)}
                            >
                              Messages
                            </button>
                          )}
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionBlock>
          </section>
        ) : null}

        {activeTab === "MESSAGES" ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <SectionBlock title="Contact conseiller" subtitle="Canal general independant des dossiers sinistres">
              {contactConversationId ? <p className="mb-2 text-xs uppercase tracking-[0.2em] text-ms-navy-soft">ID discussion: {contactConversationId}</p> : null}
              <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-ms-pearl p-3">
                {contactLoadedOnce && contactMessages.length === 0 ? (
                  <p className="text-sm text-ms-ink/65">Aucun message pour le moment. Posez votre question a un conseiller, meme sans dossier en cours.</p>
                ) : null}
                {contactMessages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-ms-navy/10 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ms-navy-soft">
                        {message.senderName} ({formatSenderRole(message.senderRole)})
                      </p>
                      <p className="text-xs text-ms-ink/60">{new Date(message.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <p className="mt-1 text-sm text-ms-ink/85">{message.body}</p>
                    {message.documentLink ? (
                      <a href={message.documentLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-ms-navy underline">
                        Voir document
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>

              <form className="mt-3 grid gap-2" onSubmit={sendGeneralContactMessage}>
                <textarea
                  required
                  value={contactForm.body}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, body: event.target.value }))}
                  rows={3}
                  placeholder="Ex: Bonjour, j'ai une question sur mes garanties"
                  className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                />
                <input
                  value={contactForm.documentLink}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, documentLink: event.target.value }))}
                  placeholder="Lien document (optionnel)"
                  className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    void uploadAttachment(file, "contact-general-message", (url) => setContactForm((prev) => ({ ...prev, documentLink: url })), "contact");
                  }}
                  className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                />
                {uploadingField === "contact-general-message" ? <p className="text-xs text-ms-navy-soft">Upload en cours...</p> : null}
                <button type="submit" className="w-fit rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">
                  Envoyer au conseiller
                </button>
                {contactConversationId ? (
                  <button
                    type="button"
                    className="w-fit rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                    onClick={closeGeneralContactConversation}
                    disabled={closingContactConversation}
                  >
                    {closingContactConversation ? "Clôture..." : "Clôturer la conversation"}
                  </button>
                ) : null}
              </form>

              <div className="mt-5 grid gap-3">
                <p className="text-sm font-semibold text-ms-navy">Historique des conversations</p>
                {contactHistory.length === 0 ? (
                  <p className="rounded-xl border border-ms-navy/10 bg-white p-4 text-sm text-ms-ink/70">Aucune conversation archivée.</p>
                ) : (
                  contactHistory.map((conversation) => (
                    <article key={conversation.id} className="rounded-xl border border-ms-navy/10 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ms-navy">Discussion {conversation.conversationId}</p>
                        <p className="text-xs text-ms-ink/60">
                          Ouverte le {new Date(conversation.openedAt).toLocaleString("fr-FR")} • Clôturée le {conversation.closedAt ? new Date(conversation.closedAt).toLocaleString("fr-FR") : "-"}
                        </p>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-ms-ink/80">
                        <p>Conseiller en charge: {conversation.handledByName ?? "Non renseigné"}</p>
                        <p>Clôturée par: {conversation.closedByName ?? "Non renseigné"}{conversation.closedByRole ? ` (${formatSenderRole(conversation.closedByRole)})` : ""}</p>
                        <p>Motif: {conversation.closureReason ?? "Aucun motif renseigné"}</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        {conversation.messages.map((message) => (
                          <div key={message.id} className="rounded-lg border border-ms-navy/10 bg-ms-pearl p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ms-navy-soft">
                                {message.senderName} ({formatSenderRole(message.senderRole)})
                              </p>
                              <p className="text-xs text-ms-ink/60">{new Date(message.createdAt).toLocaleString("fr-FR")}</p>
                            </div>
                            <p className="mt-1 text-sm text-ms-ink/85">{message.body}</p>
                            {message.documentLink ? (
                              <a href={message.documentLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-ms-navy underline">
                                Voir pièce jointe
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SectionBlock>

            <SectionBlock title="Messagerie dossiers sinistres" subtitle="Conversations reliees a un dossier sinistre">
              <div className="space-y-3 md:hidden">
                {claims.map((claim) => (
                  <article key={claim.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ms-navy">{claim.claimNumber}</p>
                        <p className="text-xs text-ms-ink/70">{claim.incidentType}</p>
                      </div>
                      <StatusBadge {...getClaimStatusLabel(claim.status)} />
                    </div>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy"
                      onClick={() => openClaimMessages(claim)}
                    >
                      Ouvrir la conversation
                    </button>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-ms-navy-soft">
                    <tr>
                      <th className="pb-3">Numero</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-ms-ink/85">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="border-t border-ms-navy/10">
                        <td className="py-3">{claim.claimNumber}</td>
                        <td className="py-3">{claim.incidentType}</td>
                        <td className="py-3"><StatusBadge {...getClaimStatusLabel(claim.status)} /></td>
                        <td className="py-3">
                          <button
                            type="button"
                            className="rounded-md border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                            onClick={() => openClaimMessages(claim)}
                          >
                            Ouvrir conversation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionBlock>
          </section>
        ) : null}

        {activeTab === "BILLING" ? (
          <SectionBlock title="Paiements & facturation" subtitle="Suivi des cotisations hebdomadaires">
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-ms-navy/10 bg-white p-4">
                  <div>
                    <p className="font-semibold text-ms-navy">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-ms-ink/70">Échéance: {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ms-ink">{invoice.amount} $</p>
                    <div className="mt-1">
                      <StatusBadge {...getInvoiceStatusLabel(invoice.status)} />
                    </div>
                    {invoice.status !== "PAID" ? (
                      <button className="mt-1 rounded-md border border-ms-navy/20 px-2 py-1 text-xs font-semibold text-ms-navy" onClick={() => markInvoicePaid(invoice.id)}>
                        Marquer payé
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>
        ) : null}
        </div>

        {openedComplementClaim ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ms-navy/35 px-4 py-8">
            <div className="w-full max-w-2xl rounded-2xl border border-ms-navy/10 bg-white p-5 shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Dossier reouvert</p>
                  <h2 className="mt-1 font-display text-2xl text-ms-navy">{openedComplementClaim.claimNumber}</h2>
                  <p className="mt-1 text-sm text-ms-ink/70">Ajoutez les informations demandées puis envoyez le complément.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-ms-navy/20 px-3 py-1.5 text-xs font-semibold text-ms-navy"
                  onClick={closeComplementModal}
                >
                  Fermer
                </button>
              </div>

              <form className="mt-4 grid gap-3 text-sm" onSubmit={handleComplementSubmit}>
                <select
                  value={complementForm.contractId}
                  onChange={(event) => setComplementForm((prev) => ({ ...prev, contractId: event.target.value }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                >
                  <option value="">Aucun contrat spécifique</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.contractNumber}
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={complementForm.incidentType}
                  onChange={(event) => setComplementForm((prev) => ({ ...prev, incidentType: event.target.value }))}
                  placeholder="Type de sinistre"
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
                <textarea
                  required
                  value={complementForm.description}
                  onChange={(event) => setComplementForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description détaillée"
                  rows={4}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
                <input
                  type="date"
                  required
                  value={complementForm.incidentDate}
                  onChange={(event) => setComplementForm((prev) => ({ ...prev, incidentDate: event.target.value }))}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
                <input
                  value={complementForm.requestedAmount}
                  onChange={(event) => setComplementForm((prev) => ({ ...prev, requestedAmount: event.target.value }))}
                  placeholder="Montant demandé (optionnel)"
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
                <input
                  value={complementForm.evidenceLink}
                  onChange={(event) => setComplementForm((prev) => ({ ...prev, evidenceLink: event.target.value }))}
                  placeholder="Lien de preuve"
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    void uploadAttachment(file, "claim-complement-evidence", (url) => setComplementForm((prev) => ({ ...prev, evidenceLink: url })), "claims");
                  }}
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5 text-sm"
                />
                {uploadingField === "claim-complement-evidence" ? <p className="text-xs text-ms-navy-soft">Upload en cours...</p> : null}
                <input
                  value={complementForm.lspdReportLink}
                  onChange={(event) => setComplementForm((prev) => ({ ...prev, lspdReportLink: event.target.value }))}
                  placeholder="Lien plainte LSPD"
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white">
                    Envoyer le complément
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-ms-navy/20 px-4 py-2.5 font-semibold text-ms-navy"
                    onClick={closeComplementModal}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {openedMessagesClaim ? (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ms-navy/35 px-4 py-8">
            <div className="w-full max-w-3xl rounded-2xl border border-ms-navy/10 bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Messagerie dossier</p>
                  <h2 className="mt-1 font-display text-2xl text-ms-navy">{openedMessagesClaim.claimNumber}</h2>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-ms-navy/20 px-3 py-1.5 text-xs font-semibold text-ms-navy"
                  onClick={closeClaimMessages}
                >
                  Fermer
                </button>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-ms-pearl p-3">
                {claimMessages.length === 0 ? (
                  <p className="text-sm text-ms-ink/65">Aucun message pour ce dossier.</p>
                ) : (
                  claimMessages.map((message) => (
                    <div key={message.id} className="rounded-lg border border-ms-navy/10 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ms-navy-soft">
                          {message.senderName} ({formatSenderRole(message.senderRole)})
                        </p>
                        <p className="text-xs text-ms-ink/60">{new Date(message.createdAt).toLocaleString("fr-FR")}</p>
                      </div>
                      <p className="mt-1 text-sm text-ms-ink/85">{message.body}</p>
                      {message.documentLink ? (
                        <a href={message.documentLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-ms-navy underline">
                          Voir document
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <form className="mt-3 grid gap-2" onSubmit={sendClaimMessage}>
                <textarea
                  required
                  value={messageForm.body}
                  onChange={(event) => setMessageForm((prev) => ({ ...prev, body: event.target.value }))}
                  rows={3}
                  placeholder="Écrire votre message"
                  className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                />
                <input
                  value={messageForm.documentLink}
                  onChange={(event) => setMessageForm((prev) => ({ ...prev, documentLink: event.target.value }))}
                  placeholder="Lien document (optionnel)"
                  className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    void uploadAttachment(file, "claim-thread-message", (url) => setMessageForm((prev) => ({ ...prev, documentLink: url })), "claims");
                  }}
                  className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                />
                {uploadingField === "claim-thread-message" ? <p className="text-xs text-ms-navy-soft">Upload en cours...</p> : null}
                <button type="submit" className="w-fit rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">
                  Envoyer
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
