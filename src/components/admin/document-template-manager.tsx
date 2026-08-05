"use client";

import { SectionBlock } from "@/components/dashboard/section-block";
import { SignaturePad } from "@/components/signature/signature-pad";
import { FormEvent, useEffect, useMemo, useState } from "react";

type TemplateItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string;
  isActive: boolean;
  updatedAt: string;
};

type GeneratedDocumentItem = {
  id: string;
  documentNumber: string;
  title: string;
  pdfUrl: string;
  signatureMethod: "DRAWN_CANVAS" | "CERTIFIED_CLICK" | null;
  signedAt: string | null;
  createdAt: string;
  template: { id: string; name: string; slug: string };
  client: { id: string; fullName: string; email: string } | null;
  creator: { id: string; fullName: string };
};

type DocumentTemplateManagerProps = {
  onStatus: (message: string) => void;
};

const emptyTemplateForm = {
  templateId: "",
  name: "",
  slug: "",
  description: "",
  content:
    "Document {{document.type}}\n\nClient: {{client.fullName}}\nNuméro contrat: {{contract.number}}\n\nObjet:\n{{document.object}}\n\nFait le {{meta.date}}.",
  isActive: true,
};

export function DocumentTemplateManager({ onStatus }: DocumentTemplateManagerProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocumentItem[]>([]);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [generateForm, setGenerateForm] = useState({
    templateId: "",
    title: "",
    clientId: "",
    contractId: "",
    payloadText: JSON.stringify(
      {
        client: { fullName: "Nom Client" },
        contract: { number: "CTR-2026-0000" },
        document: { type: "Attestation", object: "Détail du document" },
        meta: { date: new Date().toLocaleDateString("fr-FR") },
      },
      null,
      2,
    ),
    signatureMethod: "CERTIFIED_CLICK" as "CERTIFIED_CLICK" | "DRAWN_CANVAS" | "",
    signatureData: "" as string,
  });

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateForm.templateId) ?? null,
    [templates, templateForm.templateId],
  );

  async function loadData() {
    const [templatesRes, documentsRes] = await Promise.all([
      fetch("/api/admin/document-templates"),
      fetch("/api/admin/generated-documents"),
    ]);

    if (templatesRes.ok) {
      const json = await templatesRes.json();
      setTemplates(json.data ?? []);
    }

    if (documentsRes.ok) {
      const json = await documentsRes.json();
      setGeneratedDocuments(json.data ?? []);
    }
  }

  useEffect(() => {
    loadData().catch(() => onStatus("Impossible de charger les modèles de documents."));
  }, []);

  function selectTemplate(templateId: string) {
    if (!templateId) {
      setTemplateForm(emptyTemplateForm);
      return;
    }

    const selected = templates.find((item) => item.id === templateId);
    if (!selected) {
      return;
    }

    setTemplateForm({
      templateId: selected.id,
      name: selected.name,
      slug: selected.slug,
      description: selected.description ?? "",
      content: selected.content,
      isActive: selected.isActive,
    });
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch("/api/admin/document-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateForm.name,
        slug: templateForm.slug,
        description: templateForm.description || undefined,
        content: templateForm.content,
        isActive: templateForm.isActive,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      onStatus(payload?.error?.formErrors?.[0] ?? "Création du modèle impossible.");
      return;
    }

    onStatus("Modèle de document créé.");
    setTemplateForm(emptyTemplateForm);
    await loadData();
  }

  async function updateTemplate() {
    if (!templateForm.templateId) {
      onStatus("Sélectionnez un modèle à modifier.");
      return;
    }

    const response = await fetch("/api/admin/document-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: templateForm.templateId,
        name: templateForm.name,
        slug: templateForm.slug,
        description: templateForm.description,
        content: templateForm.content,
        isActive: templateForm.isActive,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      onStatus(payload?.error?.formErrors?.[0] ?? "Mise à jour du modèle impossible.");
      return;
    }

    onStatus("Modèle de document mis à jour.");
    await loadData();
  }

  async function deleteTemplate() {
    if (!templateForm.templateId) {
      onStatus("Sélectionnez un modèle à supprimer.");
      return;
    }

    const response = await fetch("/api/admin/document-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: templateForm.templateId }),
    });

    if (!response.ok) {
      onStatus("Suppression du modèle impossible.");
      return;
    }

    onStatus("Modèle supprimé.");
    setTemplateForm(emptyTemplateForm);
    await loadData();
  }

  async function generateDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!generateForm.templateId) {
      onStatus("Sélectionnez un modèle pour générer un document.");
      return;
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(generateForm.payloadText);
    } catch {
      onStatus("Payload JSON invalide.");
      return;
    }

    const response = await fetch("/api/admin/document-templates/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: generateForm.templateId,
        title: generateForm.title,
        clientId: generateForm.clientId || undefined,
        contractId: generateForm.contractId || undefined,
        payload,
        signatureMethod: generateForm.signatureMethod || undefined,
        signatureData: generateForm.signatureMethod === "DRAWN_CANVAS" ? generateForm.signatureData || undefined : undefined,
      }),
    });

    if (!response.ok) {
      const payloadError = await response.json().catch(() => null);
      onStatus(payloadError?.error?.formErrors?.[0] ?? payloadError?.error ?? "Génération du document impossible.");
      return;
    }

    onStatus("Document généré avec succès.");
    setGenerateForm((prev) => ({ ...prev, title: "", clientId: "", contractId: "" }));
    await loadData();
  }

  return (
    <>
      <SectionBlock title="Modèles de documents" subtitle="Créer, modifier et activer les modèles direction">
        <form className="grid gap-3 text-sm" onSubmit={createTemplate}>
          <select
            value={templateForm.templateId}
            onChange={(event) => selectTemplate(event.target.value)}
            className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
          >
            <option value="">Nouveau modèle</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>{item.name} ({item.slug})</option>
            ))}
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              required
              value={templateForm.name}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nom du modèle"
              className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
            />
            <input
              required
              value={templateForm.slug}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
              placeholder="Slug (ex: attestation-standard)"
              className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
            />
          </div>
          <input
            value={templateForm.description}
            onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
          />
          <textarea
            required
            value={templateForm.content}
            onChange={(event) => setTemplateForm((prev) => ({ ...prev, content: event.target.value }))}
            rows={12}
            className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5 font-mono text-xs"
          />
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-ms-navy">
            <input
              type="checkbox"
              checked={templateForm.isActive}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Modèle actif
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-full bg-ms-navy px-4 py-2 font-semibold text-white">Créer</button>
            <button type="button" onClick={updateTemplate} className="rounded-full border border-ms-navy/20 px-4 py-2 font-semibold text-ms-navy">Modifier</button>
            <button type="button" onClick={deleteTemplate} className="rounded-full border border-red-300 px-4 py-2 font-semibold text-red-700">Supprimer</button>
          </div>
        </form>
      </SectionBlock>

      <SectionBlock title="Génération de document" subtitle="Produire un PDF à partir d'un modèle avec signature optionnelle">
        <form className="grid gap-3 text-sm" onSubmit={generateDocument}>
          <select
            required
            value={generateForm.templateId}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, templateId: event.target.value }))}
            className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
          >
            <option value="">Sélectionner un modèle</option>
            {templates.filter((item) => item.isActive).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <input
            required
            value={generateForm.title}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titre du document"
            className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={generateForm.clientId}
              onChange={(event) => setGenerateForm((prev) => ({ ...prev, clientId: event.target.value }))}
              placeholder="Client ID (optionnel)"
              className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
            />
            <input
              value={generateForm.contractId}
              onChange={(event) => setGenerateForm((prev) => ({ ...prev, contractId: event.target.value }))}
              placeholder="Contract ID (optionnel)"
              className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
            />
          </div>

          <select
            value={generateForm.signatureMethod}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, signatureMethod: event.target.value as "CERTIFIED_CLICK" | "DRAWN_CANVAS" | "" }))}
            className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
          >
            <option value="">Sans signature</option>
            <option value="CERTIFIED_CLICK">Signature certifiée par clic</option>
            <option value="DRAWN_CANVAS">Signature dessinée</option>
          </select>

          {generateForm.signatureMethod === "DRAWN_CANVAS" ? (
            <SignaturePad onSignatureChange={(dataUrl) => setGenerateForm((prev) => ({ ...prev, signatureData: dataUrl ?? "" }))} />
          ) : null}

          <textarea
            value={generateForm.payloadText}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, payloadText: event.target.value }))}
            rows={10}
            className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5 font-mono text-xs"
          />

          <button type="submit" className="w-fit rounded-full bg-ms-navy px-4 py-2 font-semibold text-white">Générer le PDF</button>
        </form>
      </SectionBlock>

      <SectionBlock title="Documents générés" subtitle="Historique de génération et signatures">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-ms-navy-soft">
              <tr>
                <th className="pb-3">Numéro</th>
                <th className="pb-3">Titre</th>
                <th className="pb-3">Modèle</th>
                <th className="pb-3">Client</th>
                <th className="pb-3">Signature</th>
                <th className="pb-3">PDF</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="text-ms-ink/85">
              {generatedDocuments.map((doc) => (
                <tr key={doc.id} className="border-t border-ms-navy/10">
                  <td className="py-3">{doc.documentNumber}</td>
                  <td className="py-3">{doc.title}</td>
                  <td className="py-3">{doc.template.name}</td>
                  <td className="py-3">{doc.client?.fullName ?? "-"}</td>
                  <td className="py-3">{doc.signatureMethod ?? "-"}</td>
                  <td className="py-3">
                    <a href={doc.pdfUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-ms-navy px-3 py-1.5 text-xs font-semibold text-white">Ouvrir</a>
                  </td>
                  <td className="py-3">{new Date(doc.createdAt).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBlock>

      {selectedTemplate ? (
        <p className="text-xs text-ms-ink/60">Dernière modification du modèle sélectionné: {new Date(selectedTemplate.updatedAt).toLocaleString("fr-FR")}</p>
      ) : null}
    </>
  );
}
