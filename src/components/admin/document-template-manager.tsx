"use client";

import { SectionBlock } from "@/components/dashboard/section-block";
import { SignaturePad } from "@/components/signature/signature-pad";
import { BASE_DOCUMENT_TEMPLATE_HTML, getDefaultTemplatePayload } from "@/lib/document-template-base";
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

type PendingTemplateCreate = {
  name: string;
  slug: string;
  description?: string;
  content: string;
  isActive: boolean;
  previewUrl?: string;
  renderedContent?: string;
  previewKind?: "PDF" | "HTML";
};

type PendingDocumentGeneration = {
  request: {
    templateId: string;
    title: string;
    clientId?: string;
    contractId?: string;
    payload: Record<string, unknown>;
    signatureMethod?: "CERTIFIED_CLICK" | "DRAWN_CANVAS";
    signatureData?: string;
  };
  templateName: string;
  renderedContent: string;
  previewUrl?: string;
  previewKind?: "PDF" | "HTML";
};

function getValueByPath(payload: Record<string, unknown>, rawPath: string) {
  const pathSegments = rawPath.split(".").filter(Boolean);
  let current: unknown = payload;

  for (const segment of pathSegments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return "";
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (current === null || current === undefined) {
    return "";
  }

  if (typeof current === "object") {
    return JSON.stringify(current);
  }

  return String(current);
}

function renderTemplatePreview(content: string, payload: Record<string, unknown>) {
  return content.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, token: string) => getValueByPath(payload, token));
}

function openPreviewWindow(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(opened);
}

const emptyTemplateForm = {
  templateId: "",
  name: "",
  slug: "",
  description: "",
  content: BASE_DOCUMENT_TEMPLATE_HTML,
  isActive: true,
};

export function DocumentTemplateManager({ onStatus }: DocumentTemplateManagerProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocumentItem[]>([]);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [pendingTemplateCreate, setPendingTemplateCreate] = useState<PendingTemplateCreate | null>(null);
  const [pendingDocumentGeneration, setPendingDocumentGeneration] = useState<PendingDocumentGeneration | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [generateForm, setGenerateForm] = useState({
    templateId: "",
    title: "",
    clientId: "",
    contractId: "",
    payloadText: JSON.stringify(
      getDefaultTemplatePayload(),
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

    const draft = {
      name: templateForm.name.trim(),
      slug: templateForm.slug.trim(),
      description: templateForm.description.trim() || undefined,
      content: templateForm.content,
      isActive: templateForm.isActive,
    };

    const previewResponse = await fetch("/api/admin/document-templates/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "TEMPLATE_CREATE",
        title: draft.name,
        content: draft.content,
        payload: {},
      }),
    });

    if (!previewResponse.ok) {
      const payload = await previewResponse.json().catch(() => null);
      onStatus(payload?.error?.formErrors?.[0] ?? payload?.error ?? "Prévisualisation impossible.");
      return;
    }

    const previewJson = await previewResponse.json();
    const previewUrl = previewJson?.data?.previewUrl;
    const renderedContent = previewJson?.data?.renderedContent;
    const previewKind = previewJson?.data?.previewKind;

    setPendingTemplateCreate({
      ...draft,
      previewUrl: typeof previewUrl === "string" ? previewUrl : undefined,
      renderedContent: typeof renderedContent === "string" ? renderedContent : undefined,
      previewKind: previewKind === "HTML" ? "HTML" : "PDF",
    });

    if (typeof previewUrl === "string" && previewUrl) {
      const didOpen = openPreviewWindow(previewUrl);
      if (!didOpen) {
        onStatus("Prévisualisation prête. Cliquez sur Ouvrir le visuel de prévisualisation.");
        return;
      }
    }

    onStatus("Prévisualisez puis confirmez la création du modèle.");
  }

  async function confirmCreateTemplate() {
    if (!pendingTemplateCreate) {
      onStatus("Aucune création en attente.");
      return;
    }

    setCreatingTemplate(true);

    const response = await fetch("/api/admin/document-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pendingTemplateCreate.name,
        slug: pendingTemplateCreate.slug,
        description: pendingTemplateCreate.description,
        content: pendingTemplateCreate.content,
        isActive: pendingTemplateCreate.isActive,
      }),
    });

    try {
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        onStatus(payload?.error?.formErrors?.[0] ?? "Création du modèle impossible.");
        return;
      }

      onStatus("Modèle de document créé.");
      setTemplateForm(emptyTemplateForm);
      setPendingTemplateCreate(null);
      await loadData();
    } finally {
      setCreatingTemplate(false);
    }
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

    const template = templates.find((item) => item.id === generateForm.templateId);
    if (!template) {
      onStatus("Modèle introuvable pour la prévisualisation.");
      return;
    }

    const requestPayload = {
      mode: "DOCUMENT_GENERATE",
      title: generateForm.title,
      templateId: generateForm.templateId,
      payload,
      signatureMethod: generateForm.signatureMethod || undefined,
      signatureData: generateForm.signatureMethod === "DRAWN_CANVAS" ? generateForm.signatureData || undefined : undefined,
    };

    const previewResponse = await fetch("/api/admin/document-templates/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!previewResponse.ok) {
      const payloadError = await previewResponse.json().catch(() => null);
      onStatus(payloadError?.error?.formErrors?.[0] ?? payloadError?.error ?? "Prévisualisation impossible.");
      return;
    }

    const previewJson = await previewResponse.json();
    const previewUrl = previewJson?.data?.previewUrl;
    const renderedContent = previewJson?.data?.renderedContent;
    const previewKind = previewJson?.data?.previewKind;

    setPendingDocumentGeneration({
      request: {
        templateId: generateForm.templateId,
        title: generateForm.title,
        clientId: generateForm.clientId || undefined,
        contractId: generateForm.contractId || undefined,
        payload,
        signatureMethod: generateForm.signatureMethod || undefined,
        signatureData: generateForm.signatureMethod === "DRAWN_CANVAS" ? generateForm.signatureData || undefined : undefined,
      },
      templateName: template.name,
      renderedContent: typeof renderedContent === "string" ? renderedContent : renderTemplatePreview(template.content, payload),
      previewUrl: typeof previewUrl === "string" ? previewUrl : undefined,
      previewKind: previewKind === "HTML" ? "HTML" : "PDF",
    });

    if (typeof previewUrl === "string" && previewUrl) {
      const didOpen = openPreviewWindow(previewUrl);
      if (!didOpen) {
        onStatus("Prévisualisation prête. Cliquez sur Ouvrir le visuel de prévisualisation.");
        return;
      }
    }

    onStatus("Prévisualisez puis confirmez la génération du document.");
  }

  async function confirmGenerateDocument() {
    if (!pendingDocumentGeneration) {
      onStatus("Aucune génération en attente.");
      return;
    }

    setGeneratingDocument(true);

    const response = await fetch("/api/admin/document-templates/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingDocumentGeneration.request),
    });

    try {
      if (!response.ok) {
        const payloadError = await response.json().catch(() => null);
        onStatus(payloadError?.error?.formErrors?.[0] ?? payloadError?.error ?? "Génération du document impossible.");
        return;
      }

      onStatus("Document généré avec succès.");
      setGenerateForm((prev) => ({ ...prev, title: "", clientId: "", contractId: "", signatureData: "" }));
      setPendingDocumentGeneration(null);
      await loadData();
    } finally {
      setGeneratingDocument(false);
    }
  }

  async function deleteGeneratedDocument(document: GeneratedDocumentItem) {
    if (!window.confirm(`Supprimer le document ${document.documentNumber} ?`)) {
      return;
    }

    setDeletingDocumentId(document.id);
    try {
      const response = await fetch("/api/admin/generated-documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        onStatus(payload?.error?.formErrors?.[0] ?? payload?.error ?? "Suppression du document impossible.");
        return;
      }

      onStatus("Document supprimé.");
      setGeneratedDocuments((prev) => prev.filter((item) => item.id !== document.id));
    } finally {
      setDeletingDocumentId(null);
    }
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
            <button type="submit" className="rounded-full bg-ms-navy px-4 py-2 font-semibold text-white">Prévisualiser avant création</button>
            <button type="button" onClick={updateTemplate} className="rounded-full border border-ms-navy/20 px-4 py-2 font-semibold text-ms-navy">Modifier</button>
            <button type="button" onClick={deleteTemplate} className="rounded-full border border-red-300 px-4 py-2 font-semibold text-red-700">Supprimer</button>
          </div>
        </form>

        {pendingTemplateCreate ? (
          <div className="mt-4 rounded-2xl border border-ms-navy/15 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ms-navy-soft">Prévisualisation avant création</p>
            <div className="mt-3 grid gap-2 text-sm text-ms-ink/85">
              <p><span className="font-semibold text-ms-navy">Nom:</span> {pendingTemplateCreate.name}</p>
              <p><span className="font-semibold text-ms-navy">Slug:</span> {pendingTemplateCreate.slug}</p>
              <p><span className="font-semibold text-ms-navy">Actif:</span> {pendingTemplateCreate.isActive ? "Oui" : "Non"}</p>
              <p><span className="font-semibold text-ms-navy">Description:</span> {pendingTemplateCreate.description ?? "-"}</p>
              <div>
                <p className="font-semibold text-ms-navy">Contenu:</p>
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-ms-navy/10 bg-ms-cloud px-3 py-2 text-xs">{pendingTemplateCreate.renderedContent ?? pendingTemplateCreate.content}</pre>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingTemplateCreate.previewUrl ? (
                <a
                  href={pendingTemplateCreate.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy"
                >
                  Ouvrir le visuel de prévisualisation
                </a>
              ) : null}
              {pendingTemplateCreate.previewKind === "HTML" ? (
                <p className="w-full text-xs text-ms-ink/65">Astuce: dans l'onglet d'aperçu, utilisez l'impression du navigateur pour un rendu PDF identique.</p>
              ) : null}
              <button
                type="button"
                onClick={confirmCreateTemplate}
                disabled={creatingTemplate}
                className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingTemplate ? "Création..." : "Confirmer la création"}
              </button>
              <button
                type="button"
                onClick={() => setPendingTemplateCreate(null)}
                className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : null}
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

          <button type="submit" className="w-fit rounded-full bg-ms-navy px-4 py-2 font-semibold text-white">Prévisualiser avant génération</button>
        </form>

        {pendingDocumentGeneration ? (
          <div className="mt-4 rounded-2xl border border-ms-navy/15 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ms-navy-soft">Prévisualisation avant génération</p>
            <div className="mt-3 grid gap-2 text-sm text-ms-ink/85">
              <p><span className="font-semibold text-ms-navy">Titre:</span> {pendingDocumentGeneration.request.title}</p>
              <p><span className="font-semibold text-ms-navy">Modèle:</span> {pendingDocumentGeneration.templateName}</p>
              <p><span className="font-semibold text-ms-navy">Client ID:</span> {pendingDocumentGeneration.request.clientId ?? "-"}</p>
              <p><span className="font-semibold text-ms-navy">Contrat ID:</span> {pendingDocumentGeneration.request.contractId ?? "-"}</p>
              <p><span className="font-semibold text-ms-navy">Signature:</span> {pendingDocumentGeneration.request.signatureMethod ?? "Sans signature"}</p>
              <div>
                <p className="font-semibold text-ms-navy">Rendu du document:</p>
                <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-ms-navy/10 bg-ms-cloud px-3 py-2 text-xs">{pendingDocumentGeneration.renderedContent}</pre>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingDocumentGeneration.previewUrl ? (
                <a
                  href={pendingDocumentGeneration.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy"
                >
                  Ouvrir le visuel de prévisualisation
                </a>
              ) : null}
              {pendingDocumentGeneration.previewKind === "HTML" ? (
                <p className="w-full text-xs text-ms-ink/65">Astuce: dans l'onglet d'aperçu, utilisez l'impression du navigateur pour un rendu PDF identique.</p>
              ) : null}
              <button
                type="button"
                onClick={confirmGenerateDocument}
                disabled={generatingDocument}
                className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingDocument ? "Génération..." : "Confirmer la génération"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDocumentGeneration(null)}
                className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : null}
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
                <th className="pb-3">Actions</th>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={doc.pdfUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-ms-navy px-3 py-1.5 text-xs font-semibold text-white">Ouvrir</a>
                      <button
                        type="button"
                        onClick={() => deleteGeneratedDocument(doc)}
                        disabled={deletingDocumentId === doc.id}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingDocumentId === doc.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
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
