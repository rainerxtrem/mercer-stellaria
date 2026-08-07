"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ClaimStatus, ContractCategory, SubscriptionRequestStatus } from "@/generated/prisma/enums";
import { SectionBlock } from "@/components/dashboard/section-block";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getContractStatusLabel,
  getClaimStatusLabel,
  getInvoiceStatusLabel,
  getSubscriptionRequestStatusLabel,
} from "@/lib/status-mapping";

type Client = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  citizenUniqueId: string | null;
  birthDate: string | null;
  riskLabel: string | null;
  isArchived: boolean;
  hasOpenContactConversation?: boolean;
  hasUnreadClientMessage?: boolean;
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
  declaredAt: string;
  decisionNotes: string | null;
  status: ClaimStatus;
  requestedAmount: number | null;
  approvedAmount: number | null;
  client: { id: string; fullName: string };
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
  clientId: string;
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

type SubscriptionRequest = {
  id: string;
  requestNumber: string;
  type: "NEW_SUBSCRIPTION" | "UPGRADE";
  requestedFormula: string;
  status: SubscriptionRequestStatus;
  advisorValidated: boolean;
  client: { id: string; fullName: string };
};

type Invoice = {
  id: string;
  status: string;
  client: { id: string; fullName: string };
  contract: { formulaName: string };
  amount: string | number;
};

type DossierDetail = {
  client: {
    id: string;
    role: "CLIENT" | "COLLABORATOR" | "ADMIN" | "PUBLIC";
    fullName: string;
    email: string;
    phone: string | null;
    citizenUniqueId: string | null;
    riskLabel: string | null;
    riskScore: number | null;
    isArchived: boolean;
  };
  contracts: Array<{
    id: string;
    contractNumber: string;
    category: ContractCategory;
    formulaName: string;
    status: string;
    weeklyPremium: string | number;
    effectiveDate: string;
    expirationDate: string | null;
  }>;
  claims: Array<{
    id: string;
    claimNumber: string;
    incidentType: string;
    status: ClaimStatus;
    requestedAmount: number | null;
    approvedAmount: number | null;
    declaredAt: string;
  }>;
  requests: Array<{
    id: string;
    requestNumber: string;
    type: "NEW_SUBSCRIPTION" | "UPGRADE";
    requestedFormula: string;
    status: SubscriptionRequestStatus;
    advisorValidated: boolean;
    createdAt: string;
  }>;
};

type ContractProposalForm = {
  category: ContractCategory;
  formulaName: string;
  weeklyPremium: string;
  effectiveDate: string;
  expirationDate: string;
  coverageNotes: string;
};

type ContractActionMode = "UPGRADE" | "MODIFY";

type ContractActionForm = {
  contractId: string;
  mode: ContractActionMode;
  category: ContractCategory;
  formulaName: string;
  weeklyPremium: string;
  effectiveDate: string;
  expirationDate: string;
  coverageNotes: string;
};

export type CollaborateurTab = "CLIENTS" | "CLAIMS" | "REQUESTS" | "BILLING" | "CONTACT";
type ClaimDossierTab = "SUMMARY" | "INSURER" | "COMMUNICATION";

export type CollaborateurWorkspaceProps = {
  forcedTab?: CollaborateurTab;
  hideTabNavigation?: boolean;
};

const collaborateurTabs: Array<{ id: CollaborateurTab; label: string }> = [
  { id: "CLIENTS", label: "Fiches clients" },
  { id: "CLAIMS", label: "Sinistres" },
  { id: "REQUESTS", label: "Souscriptions" },
  { id: "BILLING", label: "Facturation" },
  { id: "CONTACT", label: "Contact direct" },
];

const claimStatusOptions: { value: ClaimStatus; label: string }[] = [
  { value: ClaimStatus.SUBMITTED, label: "Demande" },
  { value: ClaimStatus.WAITING_DETAILS, label: "En attente" },
  { value: ClaimStatus.UNDER_REVIEW, label: "En examen" },
  { value: ClaimStatus.APPROVED, label: "Valide" },
  { value: ClaimStatus.REJECTED, label: "Refuse" },
];

const requestStatusOptions: { value: SubscriptionRequestStatus; label: string }[] = [
  { value: SubscriptionRequestStatus.REQUESTED, label: "Demande" },
  { value: SubscriptionRequestStatus.WAITING_MEETING, label: "En attente RDV" },
  { value: SubscriptionRequestStatus.UNDER_REVIEW, label: "En examen" },
  { value: SubscriptionRequestStatus.APPROVED, label: "Validée" },
  { value: SubscriptionRequestStatus.REJECTED, label: "Refusee" },
];

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

export default function CollaborateurPage({ forcedTab, hideTabNavigation = false }: CollaborateurWorkspaceProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<CollaborateurTab>(forcedTab ?? "CLIENTS");
  const [clients, setClients] = useState<Client[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<DossierDetail | null>(null);
  const [claimUpdates, setClaimUpdates] = useState<Record<string, ClaimStatus>>({});
  const [requestUpdates, setRequestUpdates] = useState<Record<string, SubscriptionRequestStatus>>({});
  const [openedClaim, setOpenedClaim] = useState<Claim | null>(null);
  const [claimMessages, setClaimMessages] = useState<ClaimMessage[]>([]);
  const [insurerNote, setInsurerNote] = useState("");
  const [approvedAmountInput, setApprovedAmountInput] = useState("");
  const [messageForm, setMessageForm] = useState({ body: "", documentLink: "" });
  const [claimDossierTab, setClaimDossierTab] = useState<ClaimDossierTab>("SUMMARY");
  const [openedContactClient, setOpenedContactClient] = useState<Client | null>(null);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [contactForm, setContactForm] = useState({ body: "", documentLink: "" });
  const [openConversationClients, setOpenConversationClients] = useState<Client[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [liveUnreadClientIds, setLiveUnreadClientIds] = useState<string[]>([]);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);
  const [notificationFeed, setNotificationFeed] = useState<AppNotification[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [openedContactConversationId, setOpenedContactConversationId] = useState<string | null>(null);
  const [contractProposalForm, setContractProposalForm] = useState<ContractProposalForm>({
    category: ContractCategory.HEALTH,
    formulaName: "Care Plus",
    weeklyPremium: "",
    effectiveDate: "",
    expirationDate: "",
    coverageNotes: "",
  });
  const [contractActionForm, setContractActionForm] = useState<ContractActionForm | null>(null);
  const contactMessageIdsRef = useRef<string[]>([]);
  const openedContactClientIdRef = useRef<string | null>(null);
  const newContactMessageAudioRef = useRef<HTMLAudioElement | null>(null);

  const filteredClaims = useMemo(() => {
    if (!selectedClientId) {
      return claims;
    }

    return claims.filter((claim) => claim.client.id === selectedClientId);
  }, [claims, selectedClientId]);

  const filteredRequests = useMemo(() => {
    if (!selectedClientId) {
      return requests;
    }

    return requests.filter((request) => request.client.id === selectedClientId);
  }, [requests, selectedClientId]);

  const overview = useMemo(() => {
    return {
      activeClients: clients.filter((client) => !client.isArchived).length,
      archivedClients: clients.filter((client) => client.isArchived).length,
      claimsToReview: claims.filter((claim) => claim.status === ClaimStatus.SUBMITTED || claim.status === ClaimStatus.WAITING_DETAILS || claim.status === ClaimStatus.UNDER_REVIEW).length,
      requestsToReview: requests.filter((request) => request.status === SubscriptionRequestStatus.REQUESTED || request.status === SubscriptionRequestStatus.WAITING_MEETING || request.status === SubscriptionRequestStatus.UNDER_REVIEW).length,
    };
  }, [claims, clients, requests]);

  const unreadClientCount = useMemo(
    () => {
      const liveUnreadSet = new Set(liveUnreadClientIds);
      return clients.filter((client) => client.hasUnreadClientMessage || liveUnreadSet.has(client.id)).length;
    },
    [clients, liveUnreadClientIds],
  );

  const contactClients = useMemo(() => {
    const source = openConversationClients;
    const query = contactSearch.trim().toLowerCase();

    return source.filter((client) => {
      if (!query) {
        return true;
      }

      return [client.firstName, client.lastName, client.fullName, client.email, client.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [clients, contactSearch, openConversationClients]);

  const filteredClientRows = useMemo(() => {
    const normalizedQuery = clientSearch.trim().toLowerCase();

    return clients.filter((client) => {
      if (showArchivedOnly && !client.isArchived) {
        return false;
      }

      if (!showArchivedOnly && client.isArchived) {
        return false;
      }

      if (riskFilter !== "ALL" && (client.riskLabel ?? "NON_EVALUE") !== riskFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [client.firstName, client.lastName, client.fullName, client.email, client.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [clients, clientSearch, riskFilter, showArchivedOnly]);

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
        const payload = await response.json().catch(() => null);
        setStatus(payload?.error ?? "Upload impossible.");
        return;
      }

      const payload = await response.json();
      const uploadedUrl = payload?.data?.publicUrl;
      if (typeof uploadedUrl !== "string" || !uploadedUrl.trim()) {
        setStatus("Aucun lien de fichier n'a été renvoyé.");
        return;
      }

      apply(uploadedUrl);
      setStatus("Pièce jointe uploadée.");
    } finally {
      setUploadingField(null);
    }
  }

  async function loadData() {
    const [clientsRes, claimsRes, requestsRes, invoicesRes] = await Promise.all([
      fetch("/api/clients"),
      fetch("/api/claims"),
      fetch("/api/subscription-requests"),
      fetch("/api/invoices"),
    ]);

    if (clientsRes.ok) {
      const json = await clientsRes.json();
      const loadedClients = json.data ?? [];
      setClients(loadedClients);
      setOpenConversationClients(
        loadedClients.filter((client: Client) => client.hasOpenContactConversation),
      );
    }

    if (claimsRes.ok) {
      const json = await claimsRes.json();
      setClaims(json.data ?? []);
    }

    if (requestsRes.ok) {
      const json = await requestsRes.json();
      setRequests(json.data ?? []);
    }

    if (invoicesRes.ok) {
      const json = await invoicesRes.json();
      setInvoices(json.data ?? []);
    }

  }

  async function loadNotifications() {
    const response = await fetch("/api/notifications");
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const unreadClientIds = Array.isArray(payload?.data?.unreadClientIds) ? payload.data.unreadClientIds : [];
    setLiveUnreadClientIds(unreadClientIds);
    setFeedUnreadCount(Number(payload?.data?.feedUnreadCount ?? 0));
    setNotificationFeed(Array.isArray(payload?.data?.notifications) ? payload.data.notifications : []);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch(() => setStatus("Erreur de chargement des données."));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadData().catch(() => null);
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadNotifications().catch(() => null);
    }, 0);

    const interval = window.setInterval(() => {
      loadNotifications().catch(() => null);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!openedContactClient) {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/contact/messages?clientId=${openedContactClient.id}`);
      if (!response.ok) {
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

      if (hasNewIncomingMessage) {
        playNewContactMessageSound();
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [openedContactClient?.id]);

  useEffect(() => {
    if (!openedClaim || claimDossierTab !== "COMMUNICATION") {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/claims/messages?claimId=${openedClaim.id}`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      setClaimMessages(payload.data ?? []);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [openedClaim?.id, claimDossierTab]);

  async function openDossier(clientId: string) {
    const response = await fetch(`/api/clients/${clientId}`);
    if (!response.ok) {
      setStatus("Impossible de charger la fiche client.");
      return;
    }

    const payload = await response.json();
    setSelectedClientId(clientId);
    setSelectedDossier(payload.data as DossierDetail);
  }

  function closeDossier() {
    setSelectedClientId(null);
    setSelectedDossier(null);
    setContractActionForm(null);
    setContractProposalForm({
      category: ContractCategory.HEALTH,
      formulaName: "Care Plus",
      weeklyPremium: "",
      effectiveDate: "",
      expirationDate: "",
      coverageNotes: "",
    });
  }

  async function toggleArchive(clientId: string) {
    const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });

    if (!response.ok) {
      setStatus("Impossible de modifier l'état du dossier.");
      return;
    }

    setStatus("État du dossier client mis à jour.");
    await loadData();
    if (selectedClientId === clientId) {
      await openDossier(clientId);
    }
  }

  async function updateClaimStatus(claimId: string) {
    const statusValue = claimUpdates[claimId];
    if (!statusValue) {
      setStatus("Selectionnez un statut de sinistre.");
      return;
    }

    const claim = claims.find((item) => item.id === claimId);
    if (!claim) {
      return;
    }

    if (!isAdmin && Number(claim.requestedAmount ?? 0) > 15000) {
      setStatus("Sinistre > 15 000$: validation direction obligatoire.");
      return;
    }

    const payload: { claimId: string; status: ClaimStatus; decisionNotes?: string; approvedAmount?: string } = {
      claimId,
      status: statusValue,
    };

    if (insurerNote.trim()) {
      payload.decisionNotes = insurerNote.trim();
    }

    if (approvedAmountInput.trim()) {
      payload.approvedAmount = approvedAmountInput.trim();
    }

    const response = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      setStatus(errorPayload?.error ?? "Mise à jour du sinistre impossible.");
      return;
    }

    setStatus("Statut sinistre mis à jour.");
    await loadData();
    if (selectedClientId) {
      await openDossier(selectedClientId);
    }

    if (openedClaim?.id === claimId) {
      const refreshed = claims.find((item) => item.id === claimId);
      if (refreshed) {
        setOpenedClaim({ ...refreshed, status: statusValue });
      }
    }
  }

  async function openClaimPopup(claim: Claim) {
    setOpenedClaim(claim);
    setClaimDossierTab("SUMMARY");
    setInsurerNote(claim.decisionNotes ?? "");
    setApprovedAmountInput(claim.approvedAmount !== null ? String(claim.approvedAmount) : "");
    setMessageForm({ body: "", documentLink: "" });

    const response = await fetch(`/api/claims/messages?claimId=${claim.id}`);
    if (!response.ok) {
      setStatus("Impossible de charger la conversation du dossier.");
      setClaimMessages([]);
      return;
    }

    const payload = await response.json();
    setClaimMessages(payload.data ?? []);
    await loadData();
  }

  function closeClaimPopup() {
    setOpenedClaim(null);
    setClaimMessages([]);
    setMessageForm({ body: "", documentLink: "" });
  }

  async function sendClaimMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openedClaim) {
      return;
    }

    const response = await fetch("/api/claims/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claimId: openedClaim.id,
        body: messageForm.body,
        documentLink: messageForm.documentLink || undefined,
      }),
    });

    if (!response.ok) {
      setStatus("Impossible d'envoyer le message au client.");
      return;
    }

    setMessageForm({ body: "", documentLink: "" });

    const refreshed = await fetch(`/api/claims/messages?claimId=${openedClaim.id}`);
    if (refreshed.ok) {
      const payload = await refreshed.json();
      setClaimMessages(payload.data ?? []);
    }
  }

  async function openContactClientPopup(client: Client) {
    const isSameClient = openedContactClientIdRef.current === client.id;
    if (!isSameClient) {
      contactMessageIdsRef.current = [];
    }
    openedContactClientIdRef.current = client.id;

    setOpenedContactClient(client);
    setContactForm({ body: "", documentLink: "" });
    setActiveTab("CONTACT");

    const response = await fetch(`/api/contact/messages?clientId=${client.id}`);
    if (!response.ok) {
      setStatus("Impossible de charger le contact direct avec ce client.");
      setContactMessages([]);
      return;
    }

    const payload = await response.json();
    const nextMessages: ContactMessage[] = payload.data ?? [];
    setContactMessages(nextMessages);
    contactMessageIdsRef.current = nextMessages.map((message) => message.id);
    setOpenedContactConversationId(typeof payload?.meta?.conversationId === "string" ? payload.meta.conversationId : null);
    await loadData();
  }

  function closeContactClientPopup() {
    setOpenedContactClient(null);
    setContactMessages([]);
    setContactForm({ body: "", documentLink: "" });
    setOpenedContactConversationId(null);
    contactMessageIdsRef.current = [];
    openedContactClientIdRef.current = null;
  }

  async function closeContactDiscussion() {
    if (!openedContactClient) {
      return;
    }

    const reason = window.prompt("Motif de clôture (optionnel)")?.trim() ?? "";

    const response = await fetch(`/api/contact/messages?clientId=${openedContactClient.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined }),
    });

    if (!response.ok) {
      setStatus("Impossible de terminer la discussion.");
      return;
    }

    setStatus("Discussion terminée.");
    closeContactClientPopup();
    await loadData();
  }

  async function sendContactMessageToClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openedContactClient) {
      return;
    }

    const response = await fetch("/api/contact/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: openedContactClient.id,
        body: contactForm.body,
        documentLink: contactForm.documentLink || undefined,
      }),
    });

    if (!response.ok) {
      setStatus("Impossible d'envoyer le message de contact.");
      return;
    }

    setContactForm({ body: "", documentLink: "" });
    await openContactClientPopup(openedContactClient);
  }

  async function openConversationFromList(client: Client) {
    await openContactClientPopup(client);
  }

  async function updateRequestStatus(requestId: string) {
    const statusValue = requestUpdates[requestId];
    if (!statusValue) {
      setStatus("Selectionnez un statut de demande.");
      return;
    }

    const response = await fetch("/api/subscription-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        status: statusValue,
        advisorValidated: statusValue === SubscriptionRequestStatus.APPROVED,
      }),
    });

    if (!response.ok) {
      setStatus("Mise à jour de la demande impossible.");
      return;
    }

    setStatus("Demande de formule mise à jour.");
    await loadData();
    if (selectedClientId) {
      await openDossier(selectedClientId);
    }
  }

  async function sendReminder(invoiceId: string) {
    const response = await fetch("/api/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, action: "send_reminder" }),
    });

    if (!response.ok) {
      setStatus("Echec de l'envoi du rappel.");
      return;
    }

    setStatus("Rappel de paiement envoyé.");
    await loadData();
  }

  async function proposeContractForSelectedClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDossier) {
      return;
    }

    if (selectedDossier.client.role === "PUBLIC") {
      setStatus("La proposition de contrat est indisponible pour ce compte.");
      return;
    }

    if (!contractProposalForm.weeklyPremium.trim()) {
      setStatus("Indiquez une prime hebdomadaire pour proposer le contrat.");
      return;
    }

    if (!contractProposalForm.effectiveDate) {
      setStatus("Indiquez une date d'effet pour proposer le contrat.");
      return;
    }

    const response = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedDossier.client.id,
        category: contractProposalForm.category,
        formulaName: contractProposalForm.formulaName,
        weeklyPremium: contractProposalForm.weeklyPremium,
        coverageSummary: {
          source: "collaborator_proposal",
          notes: contractProposalForm.coverageNotes || "Proposition manuelle collaborateur",
        },
        effectiveDate: contractProposalForm.effectiveDate,
        expirationDate: contractProposalForm.expirationDate || undefined,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const errorMessage = typeof payload?.error === "string" ? payload.error : "Impossible de proposer le contrat au client.";
      setStatus(errorMessage);
      return;
    }

    setStatus("Contrat proposé au client. Signature disponible côté espace client.");
    setContractProposalForm((prev) => ({
      ...prev,
      weeklyPremium: "",
      effectiveDate: "",
      expirationDate: "",
      coverageNotes: "",
    }));

    await loadData();
    if (selectedClientId) {
      await openDossier(selectedClientId);
    }
  }

  function toInputDate(value: string | null) {
    if (!value) {
      return "";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toISOString().slice(0, 10);
  }

  function startContractAction(contract: DossierDetail["contracts"][number], mode: ContractActionMode) {
    setContractActionForm({
      contractId: contract.id,
      mode,
      category: contract.category,
      formulaName: contract.formulaName,
      weeklyPremium: String(contract.weeklyPremium),
      effectiveDate: toInputDate(contract.effectiveDate),
      expirationDate: toInputDate(contract.expirationDate),
      coverageNotes: mode === "UPGRADE"
        ? `Upgrade depuis ${contract.contractNumber}`
        : `Modification du contrat ${contract.contractNumber}`,
    });
  }

  async function submitContractAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contractActionForm) {
      return;
    }

    if (!contractActionForm.weeklyPremium.trim()) {
      setStatus("Indiquez une prime hebdomadaire.");
      return;
    }

    if (!contractActionForm.effectiveDate) {
      setStatus("Indiquez une date d'effet.");
      return;
    }

    const response = await fetch("/api/contracts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId: contractActionForm.contractId,
        action: contractActionForm.mode,
        category: contractActionForm.category,
        formulaName: contractActionForm.formulaName,
        weeklyPremium: contractActionForm.weeklyPremium,
        effectiveDate: contractActionForm.effectiveDate,
        expirationDate: contractActionForm.expirationDate || "",
        coverageSummary: {
          source: contractActionForm.mode === "UPGRADE" ? "collaborator_upgrade" : "collaborator_modify",
          notes: contractActionForm.coverageNotes || undefined,
        },
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const errorMessage = typeof payload?.error === "string" ? payload.error : "Impossible de mettre à jour le contrat.";
      setStatus(errorMessage);
      return;
    }

    setStatus(
      contractActionForm.mode === "UPGRADE"
        ? "Upgrade proposé. Signature client requise."
        : "Contrat modifié. Signature client requise.",
    );

    setContractActionForm(null);
    await loadData();
    if (selectedClientId) {
      await openDossier(selectedClientId);
    }
  }

  async function deleteContractFromDossier(contractId: string) {
    const response = await fetch("/api/contracts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId, action: "DELETE" }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const errorMessage = typeof payload?.error === "string" ? payload.error : "Suppression du contrat impossible.";
      setStatus(errorMessage);
      return;
    }

    setStatus("Contrat supprimé sans validation client.");
    setContractActionForm(null);
    await loadData();
    if (selectedClientId) {
      await openDossier(selectedClientId);
    }
  }

  return (
    <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
      <div className="workspace-grid mx-auto grid w-full max-w-7xl gap-6">
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
          <p className="workspace-kicker">Espace Collaborateur</p>
          <h1 className="workspace-title">Dossiers clients</h1>
          <p className="workspace-subtitle">Liste complète des assurés du groupe, y compris clients, collaborateurs et direction.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Dossiers actifs" value={String(overview.activeClients)} />
          <StatCard label="Dossiers archivés" value={String(overview.archivedClients)} />
          <StatCard label="Sinistres à traiter" value={String(overview.claimsToReview)} />
          <StatCard label="Demandes formule" value={String(overview.requestsToReview)} />
        </section>

        {!hideTabNavigation ? (
          <nav className="surface tab-strip p-2" aria-label="Navigation espace collaborateur">
            {collaborateurTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`tab-pill ${activeTab === tab.id ? "tab-pill-active" : ""}`}
              >
                {tab.id === "CONTACT" && unreadClientCount > 0 ? `🔔 ${tab.label}` : tab.label}
              </button>
            ))}
          </nav>
        ) : null}

        {unreadClientCount > 0 ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
            <p className="text-sm font-semibold">
              Nouveau message client ({unreadClientCount}). Ouvrez les fiches marquees 🔔.
            </p>
          </div>
        ) : null}

        <SectionBlock
          title="Centre notifications"
          subtitle="Messages, contrats, sinistres et facturation"
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
          <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-white p-3">
            {notificationFeed.length === 0 ? (
              <p className="text-sm text-ms-ink/65">Aucune notification pour le moment.</p>
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

        <div className="tab-panel">
        {activeTab === "CLIENTS" ? (
        <SectionBlock title="Fiches clients" subtitle="Ouverture des dossiers individuels et archivage sans suppression">
          <div className="mb-4 grid gap-3 rounded-2xl border border-ms-navy/10 bg-white p-4 md:grid-cols-3">
            <input
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Recherche nom, email, téléphone"
              className="rounded-xl border border-ms-navy/15 bg-ms-pearl px-3 py-2 text-sm"
            />
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="rounded-xl border border-ms-navy/15 bg-ms-pearl px-3 py-2 text-sm"
            >
              <option value="ALL">Tous risques</option>
              <option value="NON_EVALUE">Non évalué</option>
              <option value="FAIBLE">Faible</option>
              <option value="MODERE">Modéré</option>
              <option value="ELEVE">Élevé</option>
            </select>
            <button
              type="button"
              onClick={() => setShowArchivedOnly((prev) => !prev)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${showArchivedOnly ? "bg-ms-navy text-white" : "border border-ms-navy/20 text-ms-navy"}`}
            >
              {showArchivedOnly ? "Voir actifs" : "Voir archivés"}
            </button>
          </div>
          <div className="space-y-3 md:hidden">
            {filteredClientRows.length === 0 ? (
              <p className="rounded-2xl border border-ms-navy/10 bg-white p-4 text-sm text-ms-ink/70">
                Aucun dossier ne correspond aux filtres actuels.
              </p>
            ) : (
              filteredClientRows.map((client) => (
                <article key={client.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ms-navy">{client.fullName}</p>
                      <p className="text-xs text-ms-ink/70">{client.birthDate ? new Date(client.birthDate).toLocaleDateString("fr-FR") : "Date non renseignée"}</p>
                    </div>
                    <span className="rounded-full border border-ms-gold/45 bg-ms-gold/10 px-2.5 py-1 text-xs font-semibold text-ms-navy">
                      {client.riskLabel ?? "Non évalué"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-ms-ink/80">
                    <p>Téléphone: {client.phone ?? "Non renseigné"}</p>
                    <p>ID Citoyen: {client.citizenUniqueId ?? "Non renseigné"}</p>
                    <p>Dossier: {client.isArchived ? "Archivé" : "Actif"}</p>
                    <p>
                      Alerte: {client.hasUnreadClientMessage || liveUnreadClientIds.includes(client.id) ? "Nouveau message client" : "Aucune"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <button className="rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy" onClick={() => openDossier(client.id)}>
                      Gérer le dossier
                    </button>
                    <Link href={`/collaborateur/clients/${client.id}`} className="rounded-xl border border-ms-navy/20 px-3 py-2 text-center text-sm font-semibold text-ms-navy">
                      Fiche détaillée
                    </Link>
                    <button className="rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy" onClick={() => openContactClientPopup(client)}>
                      Contact
                    </button>
                    <button className="rounded-xl bg-ms-navy px-3 py-2 text-sm font-semibold text-white" onClick={() => toggleArchive(client.id)}>
                      {client.isArchived ? "Restaurer" : "Archiver"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="text-ms-navy-soft">
                <tr>
                  <th className="pb-3">Prénom</th>
                  <th className="pb-3">Nom</th>
                  <th className="pb-3">Date de naissance</th>
                  <th className="pb-3">Téléphone</th>
                  <th className="pb-3">ID Citoyen</th>
                  <th className="pb-3">Risque</th>
                  <th className="pb-3">Alertes</th>
                  <th className="pb-3">État dossier</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-ms-ink/85">
                {filteredClientRows.length === 0 ? (
                  <tr>
                    <td className="py-5 text-sm text-ms-ink/70" colSpan={9}>
                      Aucun dossier ne correspond aux filtres actuels.
                    </td>
                  </tr>
                ) : (
                  filteredClientRows.map((client) => (
                    <tr key={client.id} className="border-t border-ms-navy/10">
                      <td className="py-3">{client.firstName ?? "Non renseigné"}</td>
                      <td className="py-3">{client.lastName ?? client.fullName}</td>
                      <td className="py-3">{client.birthDate ? new Date(client.birthDate).toLocaleDateString("fr-FR") : "Non renseignée"}</td>
                      <td className="py-3">{client.phone ?? "Non renseigné"}</td>
                      <td className="py-3">{client.citizenUniqueId ?? "Non renseigné"}</td>
                      <td className="py-3">
                        <span className="rounded-full border border-ms-gold/45 bg-ms-gold/10 px-2.5 py-1 text-xs font-semibold text-ms-navy">
                          {client.riskLabel ?? "Non évalué"}
                        </span>
                      </td>
                      <td className="py-3">
                        {client.hasUnreadClientMessage || liveUnreadClientIds.includes(client.id) ? (
                          <span className="alert-badge rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                            Nouveau message client
                          </span>
                        ) : (
                          <span className="text-xs text-ms-ink/55">-</span>
                        )}
                      </td>
                      <td className="py-3">{client.isArchived ? "Archivé" : "Actif"}</td>
                      <td className="py-3 flex gap-2">
                        <button className="rounded-lg border border-ms-navy/20 px-2.5 py-1 text-xs font-semibold text-ms-navy" onClick={() => openDossier(client.id)}>
                          Gérer le dossier
                        </button>
                        <Link href={`/collaborateur/clients/${client.id}`} className="rounded-lg border border-ms-navy/20 px-2.5 py-1 text-xs font-semibold text-ms-navy">
                          Fiche détaillée
                        </Link>
                        <button className="rounded-lg border border-ms-navy/20 px-2.5 py-1 text-xs font-semibold text-ms-navy" onClick={() => openContactClientPopup(client)}>
                          Contact
                        </button>
                        <button className="rounded-lg bg-ms-navy px-2.5 py-1 text-xs font-semibold text-white" onClick={() => toggleArchive(client.id)}>
                          {client.isArchived ? "Restaurer" : "Archiver"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionBlock>
        ) : null}

        {activeTab === "CLAIMS" ? (
        <SectionBlock title="Sinistres déclarés" subtitle="Traitement avec statuts métier et règle direction > 15 000$">
          <div className="space-y-3 md:hidden">
            {filteredClaims.map((claim) => (
              <article key={claim.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ms-navy">{claim.claimNumber}</p>
                    <p className="text-xs text-ms-ink/70">{claim.client.fullName}</p>
                  </div>
                  <StatusBadge {...getClaimStatusLabel(claim.status)} />
                </div>
                <p className="mt-3 text-sm text-ms-ink/80">Montant demandé: {claim.requestedAmount ?? "-"} $</p>
                <div className="mt-4 grid gap-2">
                  <select
                    value={claimUpdates[claim.id] ?? claim.status}
                    onChange={(event) =>
                      setClaimUpdates((prev) => ({
                        ...prev,
                        [claim.id]: event.target.value as ClaimStatus,
                      }))
                    }
                    className="rounded-xl border border-ms-navy/20 bg-white px-3 py-2 text-sm"
                    disabled={!isAdmin && Number(claim.requestedAmount ?? 0) > 15000}
                  >
                    {claimStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl bg-ms-navy px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => updateClaimStatus(claim.id)}
                    disabled={!isAdmin && Number(claim.requestedAmount ?? 0) > 15000}
                  >
                    Enregistrer le statut
                  </button>
                  <button className="rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy" onClick={() => openClaimPopup(claim)}>
                    Gérer le dossier
                  </button>
                  {!isAdmin && Number(claim.requestedAmount ?? 0) > 15000 ? (
                    <p className="text-xs text-rose-700">Direction requise (montant &gt; 15 000$).</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="text-ms-navy-soft">
                <tr>
                  <th className="pb-3">Sinistre</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Montant demandé</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Changer statut</th>
                  <th className="pb-3">Dossier</th>
                </tr>
              </thead>
              <tbody className="text-ms-ink/85">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="border-t border-ms-navy/10">
                    <td className="py-3">{claim.claimNumber}</td>
                    <td className="py-3">{claim.client.fullName}</td>
                    <td className="py-3">{claim.requestedAmount ?? "-"} $</td>
                    <td className="py-3">
                      <StatusBadge {...getClaimStatusLabel(claim.status)} />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <select
                          value={claimUpdates[claim.id] ?? claim.status}
                          onChange={(event) =>
                            setClaimUpdates((prev) => ({
                              ...prev,
                              [claim.id]: event.target.value as ClaimStatus,
                            }))
                          }
                          className="rounded-lg border border-ms-navy/20 bg-white px-2.5 py-1 text-xs"
                          disabled={!isAdmin && Number(claim.requestedAmount ?? 0) > 15000}
                        >
                          {claimStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-lg bg-ms-navy px-2.5 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => updateClaimStatus(claim.id)}
                          disabled={!isAdmin && Number(claim.requestedAmount ?? 0) > 15000}
                        >
                          Enregistrer
                        </button>
                      </div>
                      {!isAdmin && Number(claim.requestedAmount ?? 0) > 15000 ? (
                        <p className="mt-1 text-xs text-rose-700">Direction requise (montant &gt; 15 000$).</p>
                      ) : null}
                    </td>
                    <td className="py-3">
                      <button className="rounded-lg border border-ms-navy/20 px-2.5 py-1 text-xs font-semibold text-ms-navy" onClick={() => openClaimPopup(claim)}>
                        Gérer le dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>
        ) : null}

        {activeTab === "REQUESTS" ? (
        <SectionBlock title="Demandes de souscription / upgrade" subtitle="Validation physique obligatoire par un conseiller">
          <div className="space-y-3 md:hidden">
            {filteredRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ms-navy">{request.requestNumber}</p>
                    <p className="text-xs text-ms-ink/70">{request.client.fullName} • {request.requestedFormula}</p>
                  </div>
                  <StatusBadge {...getSubscriptionRequestStatusLabel(request.status)} />
                </div>
                <p className="mt-3 text-xs text-ms-ink/65">{request.advisorValidated ? "Validée conseiller" : "Validation conseiller requise"}</p>
                <div className="mt-4 grid gap-2">
                  <select
                    value={requestUpdates[request.id] ?? request.status}
                    onChange={(event) =>
                      setRequestUpdates((prev) => ({
                        ...prev,
                        [request.id]: event.target.value as SubscriptionRequestStatus,
                      }))
                    }
                    className="rounded-xl border border-ms-navy/20 bg-white px-3 py-2 text-sm"
                  >
                    {requestStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-xl bg-ms-navy px-3 py-2 text-sm font-semibold text-white" onClick={() => updateRequestStatus(request.id)}>
                    Enregistrer
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-ms-navy-soft">
                <tr>
                  <th className="pb-3">Demande</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Formule</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-ms-ink/85">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="border-t border-ms-navy/10">
                    <td className="py-3">{request.requestNumber}</td>
                    <td className="py-3">{request.client.fullName}</td>
                    <td className="py-3">{request.requestedFormula}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge {...getSubscriptionRequestStatusLabel(request.status)} />
                        <span className="text-xs text-ms-ink/65">{request.advisorValidated ? "Validée conseiller" : "À valider"}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <select
                          value={requestUpdates[request.id] ?? request.status}
                          onChange={(event) =>
                            setRequestUpdates((prev) => ({
                              ...prev,
                              [request.id]: event.target.value as SubscriptionRequestStatus,
                            }))
                          }
                          className="rounded-lg border border-ms-navy/20 bg-white px-2.5 py-1 text-xs"
                        >
                          {requestStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-lg bg-ms-navy px-2.5 py-1 text-xs font-semibold text-white" onClick={() => updateRequestStatus(request.id)}>
                          Enregistrer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>
        ) : null}

        {activeTab === "BILLING" ? (
        <SectionBlock title="Paiements et relances" subtitle="Vue simplifiée des cotisations clients">
          <div className="space-y-3 md:hidden">
            {invoices
              .filter((invoice) => (selectedClientId ? invoice.client.id === selectedClientId : true))
              .map((item) => (
                <article key={item.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ms-navy">{item.client.fullName}</p>
                      <p className="text-xs text-ms-ink/70">{item.contract.formulaName}</p>
                    </div>
                    <StatusBadge {...getInvoiceStatusLabel(item.status)} />
                  </div>
                  <p className="mt-3 text-sm text-ms-ink/80">Prime: {item.amount} $</p>
                  <button className="mt-4 w-full rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy" onClick={() => sendReminder(item.id)}>
                    Relancer
                  </button>
                </article>
              ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="text-ms-navy-soft">
                <tr>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Formule</th>
                  <th className="pb-3">Prime</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-ms-ink/85">
                {invoices
                  .filter((invoice) => (selectedClientId ? invoice.client.id === selectedClientId : true))
                  .map((item) => (
                    <tr key={item.id} className="border-t border-ms-navy/10">
                      <td className="py-3">{item.client.fullName}</td>
                      <td className="py-3">{item.contract.formulaName}</td>
                      <td className="py-3">{item.amount} $</td>
                      <td className="py-3"><StatusBadge {...getInvoiceStatusLabel(item.status)} /></td>
                      <td className="py-3">
                        <button className="rounded-lg border border-ms-navy/20 px-2.5 py-1 text-xs font-semibold text-ms-navy" onClick={() => sendReminder(item.id)}>
                          Relancer
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>
        ) : null}

        {activeTab === "CONTACT" ? (
        <SectionBlock title="Contact direct Client -> Conseiller" subtitle="Canal hors sinistres pour informations et documents">
          <div className="mb-4 rounded-2xl border border-ms-navy/10 bg-white p-4">
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Rechercher une cliente</label>
            <input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder="Nom, prénom, email ou téléphone"
              className="w-full rounded-xl border border-ms-navy/15 bg-ms-pearl px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-3 md:hidden">
            {contactClients.length === 0 ? (
              <p className="rounded-2xl border border-ms-navy/10 bg-white p-4 text-sm text-ms-ink/70">Aucune cliente trouvée.</p>
            ) : contactClients.map((client) => (
              <article key={client.id} className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ms-navy">{client.fullName}</p>
                    <p className="text-xs text-ms-ink/70">{client.phone ?? "Téléphone non renseigné"}</p>
                  </div>
                  <span className="rounded-full border border-ms-gold/45 bg-ms-gold/10 px-2.5 py-1 text-xs font-semibold text-ms-navy">
                    {client.riskLabel ?? "Non évalué"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ms-ink/80">
                  {client.hasOpenContactConversation ? "Discussion ouverte" : "Pas de discussion ouverte"}
                </p>
                <button className="mt-4 w-full rounded-xl border border-ms-navy/20 px-3 py-2 text-sm font-semibold text-ms-navy" onClick={() => openConversationFromList(client)}>
                  Ouvrir conversation
                </button>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-ms-navy-soft">
                <tr>
                  <th className="pb-3">Prénom</th>
                  <th className="pb-3">Nom</th>
                  <th className="pb-3">Date de naissance</th>
                  <th className="pb-3">Téléphone</th>
                  <th className="pb-3">Risque</th>
                  <th className="pb-3">Alertes</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-ms-ink/85">
                {contactClients.length === 0 ? (
                  <tr>
                    <td className="py-5 text-sm text-ms-ink/70" colSpan={7}>
                      Aucune cliente trouvée.
                    </td>
                  </tr>
                ) : contactClients.map((client) => (
                  <tr key={client.id} className="border-t border-ms-navy/10">
                    <td className="py-3">{client.firstName ?? "Non renseigné"}</td>
                    <td className="py-3">{client.lastName ?? client.fullName}</td>
                    <td className="py-3">{client.birthDate ? new Date(client.birthDate).toLocaleDateString("fr-FR") : "Non renseignée"}</td>
                    <td className="py-3">{client.phone ?? "Non renseigné"}</td>
                    <td className="py-3">{client.riskLabel ?? "Non évalué"}</td>
                    <td className="py-3">
                      {client.hasOpenContactConversation ? (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                          Discussion ouverte
                        </span>
                      ) : (
                        <span className="rounded-full border border-ms-navy/15 bg-ms-pearl px-2 py-1 text-xs font-semibold text-ms-navy-soft">
                          Pas de discussion ouverte
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <button className="rounded-lg border border-ms-navy/20 px-2.5 py-1 text-xs font-semibold text-ms-navy" onClick={() => openConversationFromList(client)}>
                        Ouvrir conversation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {openedContactClient ? (
            <div className="mt-5 rounded-2xl border border-ms-navy/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-ms-navy-soft">Contact direct</p>
                  <h3 className="mt-1 font-display text-2xl text-ms-navy">{openedContactClient.fullName}</h3>
                  {openedContactConversationId ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ms-navy-soft">ID discussion: {openedContactConversationId}</p>
                  ) : null}
                </div>
                <button className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy" onClick={closeContactClientPopup}>
                  Fermer
                </button>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-ms-pearl p-3">
                {contactMessages.length === 0 ? (
                  <p className="text-sm text-ms-ink/65">Aucun message dans ce canal.</p>
                ) : (
                  contactMessages.map((message) => (
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

              <form className="mt-3 grid gap-2" onSubmit={sendContactMessageToClient}>
                <textarea
                  required
                  value={contactForm.body}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, body: event.target.value }))}
                  rows={3}
                  placeholder="Écrire un message au client"
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

                    void uploadAttachment(file, "collab-contact-message", (url) => setContactForm((prev) => ({ ...prev, documentLink: url })), "contact");
                  }}
                  className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                />
                {uploadingField === "collab-contact-message" ? <p className="text-xs text-ms-navy-soft">Upload en cours...</p> : null}
                <button type="submit" className="w-fit rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">
                  Envoyer au client
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={closeContactDiscussion} className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
                  Terminer la discussion
                </button>
              </div>
            </div>
          ) : null}
        </SectionBlock>
        ) : null}
        </div>

        {selectedDossier ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="surface max-h-[90vh] w-full max-w-5xl overflow-auto p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-ms-navy-soft">Popup dossier client</p>
                  <h2 className="mt-2 font-display text-4xl text-ms-navy">{selectedDossier.client.fullName}</h2>
                  <p className="mt-1 text-sm text-ms-ink/75">{selectedDossier.client.phone ?? "Téléphone non renseigné"}</p>
                  <p className="mt-1 text-sm text-ms-ink/75">ID Citoyen Unique: {selectedDossier.client.citizenUniqueId ?? "Non renseigné"}</p>
                </div>
                <button className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy" onClick={closeDossier}>
                  Fermer
                </button>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Risque</p>
                  <p className="mt-2 text-sm text-ms-ink/85">{selectedDossier.client.riskLabel ?? "Non évalué"} ({selectedDossier.client.riskScore ?? "-"})</p>
                </div>
                <div className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">État dossier</p>
                  <p className="mt-2 text-sm text-ms-ink/85">{selectedDossier.client.isArchived ? "Archivé" : "Actif"}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Contrats</p>
                  <div className="mt-3 space-y-2">
                    {selectedDossier.contracts.map((contract) => (
                      <div key={contract.id} className="rounded-lg border border-ms-navy/10 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-ms-navy">{contract.contractNumber}</p>
                            <p className="text-xs text-ms-ink/70">{contract.formulaName} - {contract.weeklyPremium} $/sem</p>
                          </div>
                          <StatusBadge {...getContractStatusLabel(contract.status)} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                            onClick={() => startContractAction(contract, "UPGRADE")}
                          >
                            Proposer un upgrade
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                            onClick={() => startContractAction(contract, "MODIFY")}
                          >
                            Modifier le contrat
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                            onClick={() => deleteContractFromDossier(contract.id)}
                          >
                            Supprimer le contrat
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {contractActionForm ? (
                    <form className="mt-4 grid gap-3 border-t border-ms-navy/10 pt-4" onSubmit={submitContractAction}>
                      <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">
                        {contractActionForm.mode === "UPGRADE" ? "Upgrade avec signature client" : "Modification avec signature client"}
                      </p>
                      <select
                        value={contractActionForm.category}
                        onChange={(event) =>
                          setContractActionForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  category: event.target.value as ContractCategory,
                                }
                              : prev,
                          )
                        }
                        className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                      >
                        <option value={ContractCategory.HEALTH}>Santé</option>
                        <option value={ContractCategory.THEFT_BURGLARY}>Vol & cambriolage</option>
                        <option value={ContractCategory.PROFESSIONAL}>Professionnel</option>
                      </select>
                      <input
                        required
                        value={contractActionForm.formulaName}
                        onChange={(event) =>
                          setContractActionForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  formulaName: event.target.value,
                                }
                              : prev,
                          )
                        }
                        placeholder="Formule"
                        className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                      />
                      <input
                        required
                        value={contractActionForm.weeklyPremium}
                        onChange={(event) =>
                          setContractActionForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  weeklyPremium: event.target.value,
                                }
                              : prev,
                          )
                        }
                        placeholder="Prime hebdomadaire ($)"
                        inputMode="decimal"
                        className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                      />
                      <input
                        required
                        type="date"
                        value={contractActionForm.effectiveDate}
                        onChange={(event) =>
                          setContractActionForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  effectiveDate: event.target.value,
                                }
                              : prev,
                          )
                        }
                        className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                      />
                      <input
                        type="date"
                        value={contractActionForm.expirationDate}
                        onChange={(event) =>
                          setContractActionForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  expirationDate: event.target.value,
                                }
                              : prev,
                          )
                        }
                        className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                      />
                      <textarea
                        value={contractActionForm.coverageNotes}
                        onChange={(event) =>
                          setContractActionForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  coverageNotes: event.target.value,
                                }
                              : prev,
                          )
                        }
                        rows={3}
                        placeholder="Notes de couverture"
                        className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">
                          {contractActionForm.mode === "UPGRADE" ? "Valider l'upgrade" : "Valider la modification"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy"
                          onClick={() => setContractActionForm(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Demandes formules</p>
                  <div className="mt-3 space-y-2">
                    {selectedDossier.requests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between rounded-lg border border-ms-navy/10 p-3">
                        <div>
                          <p className="text-sm font-semibold text-ms-navy">{request.requestNumber}</p>
                          <p className="text-xs text-ms-ink/70">{request.type === "UPGRADE" ? "Upgrade" : "Souscription"} - {request.requestedFormula}</p>
                        </div>
                        <StatusBadge {...getSubscriptionRequestStatusLabel(request.status)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedDossier.client.role !== "PUBLIC" ? (
              <div className="mt-6 rounded-2xl border border-ms-navy/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Proposition de contrat</p>
                <p className="mt-2 text-sm text-ms-ink/80">
                  Dès validation, le contrat passera en attente de signature dans l&apos;espace client.
                </p>

                <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={proposeContractForSelectedClient}>
                  <select
                    value={contractProposalForm.category}
                    onChange={(event) =>
                      setContractProposalForm((prev) => ({
                        ...prev,
                        category: event.target.value as ContractCategory,
                      }))
                    }
                    className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                  >
                    <option value={ContractCategory.HEALTH}>Santé</option>
                    <option value={ContractCategory.THEFT_BURGLARY}>Vol & cambriolage</option>
                    <option value={ContractCategory.PROFESSIONAL}>Professionnel</option>
                  </select>

                  <input
                    required
                    value={contractProposalForm.formulaName}
                    onChange={(event) =>
                      setContractProposalForm((prev) => ({
                        ...prev,
                        formulaName: event.target.value,
                      }))
                    }
                    placeholder="Nom de la formule"
                    className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                  />

                  <input
                    required
                    value={contractProposalForm.weeklyPremium}
                    onChange={(event) =>
                      setContractProposalForm((prev) => ({
                        ...prev,
                        weeklyPremium: event.target.value,
                      }))
                    }
                    placeholder="Prime hebdomadaire ($)"
                    inputMode="decimal"
                    className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                  />

                  <input
                    required
                    type="date"
                    value={contractProposalForm.effectiveDate}
                    onChange={(event) =>
                      setContractProposalForm((prev) => ({
                        ...prev,
                        effectiveDate: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                  />

                  <input
                    type="date"
                    value={contractProposalForm.expirationDate}
                    onChange={(event) =>
                      setContractProposalForm((prev) => ({
                        ...prev,
                        expirationDate: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                  />

                  <textarea
                    value={contractProposalForm.coverageNotes}
                    onChange={(event) =>
                      setContractProposalForm((prev) => ({
                        ...prev,
                        coverageNotes: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Notes de couverture (optionnel)"
                    className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 md:col-span-2"
                  />

                  <div className="md:col-span-2">
                    <button type="submit" className="w-fit rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">
                      Proposer ce contrat au client
                    </button>
                  </div>
                </form>
              </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {openedClaim ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8">
            <div className="surface max-h-[90vh] w-full max-w-5xl overflow-auto p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-ms-navy-soft">Gestion dossier sinistre</p>
                  <h2 className="mt-2 font-display text-4xl text-ms-navy">{openedClaim.claimNumber}</h2>
                  <p className="mt-1 text-sm text-ms-ink/75">Client: {openedClaim.client.fullName}</p>
                </div>
                <button className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy" onClick={closeClaimPopup}>
                  Fermer
                </button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="col-span-full tab-strip">
                  <button
                    type="button"
                    onClick={() => setClaimDossierTab("SUMMARY")}
                    className={`tab-pill ${claimDossierTab === "SUMMARY" ? "tab-pill-active" : ""}`}
                  >
                    Synthèse
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimDossierTab("INSURER")}
                    className={`tab-pill ${claimDossierTab === "INSURER" ? "tab-pill-active" : ""}`}
                  >
                    Traitement assureur
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimDossierTab("COMMUNICATION")}
                    className={`tab-pill ${claimDossierTab === "COMMUNICATION" ? "tab-pill-active" : ""}`}
                  >
                    Communication client
                  </button>
                </div>

                {claimDossierTab === "SUMMARY" ? (
                <div className="rounded-2xl border border-ms-navy/10 bg-white p-4 lg:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Informations sinistre</p>
                  <div className="mt-3 grid gap-2 text-sm text-ms-ink/85 md:grid-cols-2">
                    <p><span className="font-semibold">Type:</span> {openedClaim.incidentType}</p>
                    <p><span className="font-semibold">Date incident:</span> {new Date(openedClaim.incidentDate).toLocaleDateString("fr-FR")}</p>
                    <p><span className="font-semibold">Montant demandé:</span> {openedClaim.requestedAmount ?? "-"} $</p>
                    <p><span className="font-semibold">Montant approuvé:</span> {openedClaim.approvedAmount ?? "-"} $</p>
                    <p><span className="font-semibold">Preuve:</span> {openedClaim.evidenceLink ?? "-"}</p>
                    <p><span className="font-semibold">Plainte:</span> {openedClaim.lspdReportLink ?? "-"}</p>
                  </div>
                  <p className="mt-3 text-sm text-ms-ink/85"><span className="font-semibold">Description:</span> {openedClaim.description}</p>
                </div>
                ) : null}

                {claimDossierTab === "INSURER" ? (
                <div className="rounded-2xl border border-ms-navy/10 bg-white p-4 lg:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Action assureur</p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <select
                        value={claimUpdates[openedClaim.id] ?? openedClaim.status}
                        onChange={(event) =>
                          setClaimUpdates((prev) => ({
                            ...prev,
                            [openedClaim.id]: event.target.value as ClaimStatus,
                          }))
                        }
                        className="rounded-lg border border-ms-navy/20 bg-white px-2.5 py-1 text-xs"
                        disabled={!isAdmin && Number(openedClaim.requestedAmount ?? 0) > 15000}
                      >
                        {claimStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-lg bg-ms-navy px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => updateClaimStatus(openedClaim.id)}
                        disabled={!isAdmin && Number(openedClaim.requestedAmount ?? 0) > 15000}
                      >
                        Enregistrer statut
                      </button>
                    </div>
                    <input
                      value={approvedAmountInput}
                      onChange={(event) => setApprovedAmountInput(event.target.value)}
                      placeholder="Montant approuvé (optionnel)"
                      className="w-full rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                    />
                    <textarea
                      value={insurerNote}
                      onChange={(event) => setInsurerNote(event.target.value)}
                      rows={4}
                      placeholder="Commentaire assureur / demande d'information"
                      className="w-full rounded-xl border border-ms-navy/15 bg-white px-3 py-2"
                    />
                  </div>
                </div>
                ) : null}
              </div>

              {claimDossierTab === "COMMUNICATION" ? (
              <div className="mt-6 rounded-2xl border border-ms-navy/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">Canal de communication</p>
                <div className="mt-3 max-h-64 space-y-2 overflow-auto rounded-xl border border-ms-navy/10 bg-ms-pearl p-3">
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
                    placeholder="Écrire un message au client"
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

                      void uploadAttachment(file, "collab-claim-message", (url) => setMessageForm((prev) => ({ ...prev, documentLink: url })), "claims");
                    }}
                    className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2 text-sm"
                  />
                  {uploadingField === "collab-claim-message" ? <p className="text-xs text-ms-navy-soft">Upload en cours...</p> : null}
                  <button type="submit" className="w-fit rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white">
                    Envoyer au client
                  </button>
                </form>
              </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
