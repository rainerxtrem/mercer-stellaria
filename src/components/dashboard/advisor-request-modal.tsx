"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ServiceMode } from "@/components/dashboard/operational-mock";

type RequestType = "appointment" | "claim" | "arbitrage";

type AdvisorRequestModalProps = {
  isOpen: boolean;
  service: ServiceMode;
  requestType: RequestType;
  onClose: () => void;
  onSubmitted: (message: string) => void;
};

const requestTypeLabels: Record<RequestType, string> = {
  appointment: "Prendre RDV avec mon conseiller",
  claim: "Déclarer un sinistre",
  arbitrage: "Demander un arbitrage",
};

const requestTypeOptions: Record<RequestType, string[]> = {
  appointment: ["Point de portefeuille", "Point stratégique", "Revue annuelle", "Autre"],
  claim: ["Déclaration initiale", "Transmission de pièces", "Suivi indemnisation", "Autre"],
  arbitrage: ["Réallocation prudente", "Réallocation équilibrée", "Réallocation dynamique", "Autre"],
};

export function AdvisorRequestModal({ isOpen, service, requestType, onClose, onSubmitted }: AdvisorRequestModalProps) {
  const [reason, setReason] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const serviceLabel = service === "investment" ? "Investment" : "Assurance";
  const requestLabel = requestTypeLabels[requestType];
  const options = useMemo(() => requestTypeOptions[requestType], [requestType]);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setRequestedDate("");
      setRequestedTime("");
      setMessage("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const body = [
      `[${serviceLabel}] ${requestLabel}`,
      `Motif: ${reason || "Non précisé"}`,
      requestedDate ? `Date souhaitée: ${requestedDate}` : null,
      requestedTime ? `Heure souhaitée: ${requestedTime}` : null,
      message.trim() ? `Message: ${message.trim()}` : null,
    ].filter(Boolean).join("\n");

    try {
      const response = await fetch("/api/contact/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, documentLink: "" }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const nextError = typeof payload?.error === "string" ? payload.error : "Impossible d'envoyer votre demande.";
        setError(nextError);
        return;
      }

      onSubmitted("Votre demande a bien été transmise à votre conseiller.");
      onClose();
    } catch {
      setError("Impossible d'envoyer votre demande pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ms-navy/45 px-4">
      <div className="surface w-full max-w-xl p-6">
        <h3 className="font-display text-3xl text-ms-navy">{requestLabel}</h3>
        <p className="mt-2 text-sm text-ms-ink/80">Complétez votre demande {service === "investment" ? "investment" : "assurance"} pour transmission au conseiller.</p>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-ms-ink/85">
            Motif
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2">
              <option value="">Sélectionner un motif</option>
              {options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-ms-ink/85">
              Date souhaitée
              <input type="date" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm text-ms-ink/85">
              Heure souhaitée
              <input type="time" value={requestedTime} onChange={(event) => setRequestedTime(event.target.value)} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2" />
            </label>
          </div>

          <label className="grid gap-2 text-sm text-ms-ink/85">
            Message
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2" placeholder="Précisez vos attentes ou le contexte de votre demande." />
          </label>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-full bg-ms-navy px-4 py-2 text-xs font-semibold text-white" disabled={isSubmitting}>
              {isSubmitting ? "Envoi..." : "Envoyer la demande"}
            </button>
            <button type="button" className="rounded-full border border-ms-navy/20 px-4 py-2 text-xs font-semibold text-ms-navy" onClick={onClose}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
