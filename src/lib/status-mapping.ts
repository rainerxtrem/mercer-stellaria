import { ClaimStatus, ContractStatus, InvoiceStatus, SubscriptionRequestStatus } from "@/generated/prisma/enums";

export type StatusBadgeTone = "blue" | "gold" | "green" | "red" | "slate";

export function getContractStatusLabel(status: ContractStatus | string) {
  switch (status) {
    case ContractStatus.DRAFT:
      return { label: "Brouillon", tone: "slate" as const };
    case ContractStatus.PENDING_SIGNATURE:
      return { label: "Signature requise", tone: "gold" as const };
    case ContractStatus.ACTIVE:
      return { label: "Active", tone: "green" as const };
    case ContractStatus.SUSPENDED:
      return { label: "Suspendue", tone: "red" as const };
    case ContractStatus.TERMINATED:
      return { label: "Resiliee", tone: "slate" as const };
    default:
      return { label: "Inconnu", tone: "slate" as const };
  }
}

export function getInvoiceStatusLabel(status: InvoiceStatus | string) {
  switch (status) {
    case InvoiceStatus.PENDING:
      return { label: "En attente", tone: "gold" as const };
    case InvoiceStatus.PAID:
      return { label: "Payee", tone: "green" as const };
    case InvoiceStatus.LATE:
      return { label: "En retard", tone: "red" as const };
    case InvoiceStatus.CANCELED:
      return { label: "Annulee", tone: "slate" as const };
    default:
      return { label: "Inconnu", tone: "slate" as const };
  }
}

export function getClaimStatusLabel(status: ClaimStatus | string) {
  switch (status) {
    case ClaimStatus.SUBMITTED:
      return { label: "Demande", tone: "blue" as const };
    case ClaimStatus.WAITING_DETAILS:
      return { label: "En attente", tone: "gold" as const };
    case ClaimStatus.UNDER_REVIEW:
      return { label: "En examen", tone: "blue" as const };
    case ClaimStatus.APPROVED:
    case ClaimStatus.PAID:
      return { label: "Valide", tone: "green" as const };
    case ClaimStatus.REJECTED:
      return { label: "Refuse", tone: "red" as const };
    default:
      return { label: "Inconnu", tone: "slate" as const };
  }
}

export function getSubscriptionRequestStatusLabel(status: SubscriptionRequestStatus | string) {
  switch (status) {
    case SubscriptionRequestStatus.REQUESTED:
      return { label: "Demande", tone: "blue" as const };
    case SubscriptionRequestStatus.WAITING_MEETING:
      return { label: "En attente RDV", tone: "gold" as const };
    case SubscriptionRequestStatus.UNDER_REVIEW:
      return { label: "En examen", tone: "blue" as const };
    case SubscriptionRequestStatus.APPROVED:
      return { label: "Validee", tone: "green" as const };
    case SubscriptionRequestStatus.REJECTED:
      return { label: "Refusee", tone: "red" as const };
    default:
      return { label: "Inconnu", tone: "slate" as const };
  }
}
