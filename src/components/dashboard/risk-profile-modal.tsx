"use client";

import { FormEvent, useEffect, useState } from "react";
import { ManagerClientRow } from "@/components/dashboard/operational-mock";

type RiskProfile = "Prudent" | "Equilibre" | "Dynamique";

type RiskProfileModalProps = {
  isOpen: boolean;
  rows: ManagerClientRow[];
  onClose: () => void;
  onSave: (clientId: string, riskProfile: RiskProfile) => void;
};

export function RiskProfileModal({ isOpen, rows, onClose, onSave }: RiskProfileModalProps) {
  const [clientId, setClientId] = useState("");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("Equilibre");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setClientId(rows[0]?.id ?? "");
    setRiskProfile((rows[0]?.riskProfile as RiskProfile | undefined) ?? "Equilibre");
  }, [isOpen, rows]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId) {
      return;
    }

    onSave(clientId, riskProfile);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ms-navy/45 px-4">
      <div className="surface w-full max-w-lg p-6">
        <h3 className="font-display text-3xl text-ms-navy">Mettre à jour le profil de risque</h3>
        <p className="mt-2 text-sm text-ms-ink/80">Sélectionnez un client et appliquez un nouveau profil localement, prêt à brancher sur l'API.</p>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-ms-ink/85">
            Client
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2">
              {rows.map((row) => (
                <option key={row.id} value={row.id}>{row.fullName}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-ms-ink/85">
            Profil de risque
            <select value={riskProfile} onChange={(event) => setRiskProfile(event.target.value as RiskProfile)} className="rounded-xl border border-ms-navy/15 bg-white px-3 py-2">
              <option value="Prudent">Prudent</option>
              <option value="Equilibre">Équilibré</option>
              <option value="Dynamique">Dynamique</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-full bg-ms-navy px-4 py-2 text-xs font-semibold text-white" disabled={rows.length === 0}>
              Enregistrer
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
