export const TRANSPARENT_IMAGE_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

export const BASE_DOCUMENT_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>{{document.type}} - Mercer & Stellaria</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 45mm 20mm 35mm 20mm;
      background-color: #f4f5f7;
      @top-center {
        content: element(header);
      }
      @bottom-center {
        content: element(footer);
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #2d3748;
      font-size: 10pt;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background: #f4f5f7;
    }

    .header {
      position: running(header);
      width: 100%;
      margin-top: 15mm;
      padding-bottom: 5px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-table td {
      vertical-align: middle;
    }
    .brand-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      display: block;
    }
    .brand-name {
      font-family: 'Georgia', serif;
      font-size: 20pt;
      font-weight: bold;
      color: #0f2043;
      letter-spacing: 2.5px;
      margin: 0;
      line-height: 1.1;
    }
    .brand-tagline {
      font-size: 7.5pt;
      color: #c5a059;
      letter-spacing: 3.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .contact-info {
      text-align: right;
      font-size: 8pt;
      color: #4a5568;
      line-height: 1.5;
    }
    .header-line-1 {
      height: 2px;
      background-color: #0f2043;
      margin-top: 15px;
      width: 100%;
    }
    .header-line-2 {
      height: 1px;
      background-color: #c5a059;
      margin-top: 2px;
      width: 100%;
    }

    .footer {
      position: running(footer);
      width: 100%;
      margin-bottom: 12mm;
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      text-align: center;
      font-size: 7.5pt;
      color: #718096;
      line-height: 1.5;
    }
    .footer-accent {
      color: #c5a059;
      font-weight: bold;
    }

    .doc-banner {
      background-color: #0f2043;
      color: #ffffff;
      text-align: center;
      padding: 14px 20px;
      margin: 8mm 0 12mm 0;
      border-radius: 4px;
      border-bottom: 3px solid #c5a059;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .doc-banner h1 {
      font-family: 'Georgia', serif;
      font-size: 16pt;
      font-weight: normal;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin: 0;
      color: #ffffff;
    }
    .doc-ref {
      font-size: 8.5pt;
      color: #cbd5e1;
      margin-top: 5px;
      font-family: 'Helvetica Neue', sans-serif;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .doc-ref span {
      color: #c5a059;
      font-weight: bold;
    }

    .meta-container {
      width: 100%;
      margin-bottom: 12mm;
      border-collapse: separate;
      border-spacing: 4% 0;
      margin-left: -2%;
      margin-right: -2%;
    }
    .meta-container td {
      width: 50%;
      background-color: #ffffff;
      border-radius: 6px;
      padding: 18px;
      vertical-align: top;
      box-shadow: 0 2px 5px rgba(0,0,0,0.03);
      border: 1px solid #e2e8f0;
    }
    .td-emetteur {
      border-top: 4px solid #c5a059 !important;
    }
    .td-destinataire {
      border-top: 4px solid #0f2043 !important;
    }
    .meta-title {
      font-family: 'Georgia', serif;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .td-emetteur .meta-title {
      color: #c5a059;
    }
    .td-destinataire .meta-title {
      color: #0f2043;
    }
    .meta-content {
      font-size: 9.5pt;
      line-height: 1.7;
      color: #4a5568;
    }
    .meta-content strong {
      color: #1a2a3a;
      font-size: 10.5pt;
      display: block;
      margin-bottom: 4px;
    }
    .meta-date {
      display: block;
      margin-top: 10px;
      font-size: 8.5pt;
      color: #a0aec0;
    }

    .section-title {
      font-family: 'Georgia', serif;
      font-size: 13pt;
      color: #0f2043;
      margin-top: 25px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      page-break-after: avoid;
    }
    .section-title::after {
      content: "";
      display: block;
      width: 40px;
      height: 2px;
      background-color: #c5a059;
      margin-top: 6px;
    }

    .content-block {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 20px;
      color: #4a5568;
      font-size: 9.5pt;
      margin-bottom: 20px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      white-space: pre-wrap;
    }

    .signature-area {
      width: 100%;
      margin-top: 20mm;
      border-collapse: separate;
      border-spacing: 5% 0;
      margin-left: -2.5%;
      margin-right: -2.5%;
      page-break-inside: avoid;
    }
    .signature-area td {
      width: 50%;
      vertical-align: top;
    }
    .sig-block {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .sig-header {
      font-family: 'Georgia', serif;
      font-size: 10pt;
      color: #0f2043;
      font-weight: bold;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
      margin-bottom: 4px;
    }
    .sig-subheader {
      font-size: 8pt;
      color: #a0aec0;
      margin-bottom: 15px;
      min-height: 12px;
    }
    .sig-space {
      height: 90px;
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .sig-space img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="header">
    <table class="header-table">
      <tr>
        <td style="width: 65px;">
          <img class="brand-logo" src="/Mercer_Stellaria_LOGOBLEU.png" alt="Logo Mercer & Stellaria" />
        </td>
        <td>
          <div class="brand-name">MERCER & STELLARIA</div>
          <div class="brand-tagline">Insurance & Corporation</div>
        </td>
        <td class="contact-info">
          <strong>Executive Tower</strong>, Rockford Hills<br>
          <strong>Tél :</strong> Annuaire ➔ Mercer Corp<br>
          <strong>Discord :</strong> discord.gg/dv4u7E25mR
        </td>
      </tr>
    </table>
    <div class="header-line-1"></div>
    <div class="header-line-2"></div>
  </div>

  <div class="footer">
    <span class="footer-accent">MERCER & STELLARIA CORPORATION</span> — Société par actions enregistrée à l'État de San Andreas<br>
    Ce document revêt un caractère strictement confidentiel. Toute altération, fraude ou falsification fera l'objet de poursuites judiciaires immédiates.
  </div>

  <div class="doc-banner">
    <h1>{{document.type}}</h1>
    <div class="doc-ref">RÉFÉRENCE : <span>{{document.reference}}</span></div>
  </div>

  <table class="meta-container">
    <tr>
      <td class="td-emetteur">
        <div class="meta-title">Délivré par</div>
        <div class="meta-content">
          <strong>Mercer & Stellaria Insurance</strong>
          Département : {{issuer.department}}<br>
          Agent en charge : {{issuer.agentName}}
          <span class="meta-date">Fait à {{meta.city}}, le {{meta.date}}</span>
        </div>
      </td>
      <td class="td-destinataire">
        <div class="meta-title">À l'attention de</div>
        <div class="meta-content">
          <strong>{{client.fullName}}</strong>
          Entité : {{client.entity}}<br>
          Contact : {{client.phone}}
          <span class="meta-date">N° Assuré / Dossier : {{client.dossierNumber}}</span>
        </div>
      </td>
    </tr>
  </table>

  <div class="section-title">1. Objet & Contexte</div>
  <div class="content-block">{{document.section1}}</div>

  <div class="section-title">2. Détails & Facturation</div>
  <div class="content-block">{{document.section2}}</div>

  <table class="signature-area">
    <tr>
      <td>
        <div class="sig-block">
          <div class="sig-header">L'Assureur / Le Cabinet</div>
          <div class="sig-subheader">{{signature.insurerLabel}}</div>
          <div class="sig-space">
            <img src="{{signature.insurerImage}}" alt="Signature assureur" />
          </div>
        </div>
      </td>
      <td>
        <div class="sig-block">
          <div class="sig-header">Le Client / L'Assuré</div>
          <div class="sig-subheader">{{signature.clientLabel}}</div>
          <div class="sig-space">
            <img src="{{signature.clientImage}}" alt="Signature client" />
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function getDefaultTemplatePayload() {
  return {
    document: {
      type: "Attestation",
      reference: "DOC-2026-0001",
      section1: "Objet du document...",
      section2: "Détails complémentaires...",
    },
    issuer: {
      department: "Direction",
      agentName: "Nom de l'agent",
    },
    client: {
      fullName: "Prénom Nom",
      entity: "Particulier",
      phone: "N/A",
      dossierNumber: "N/A",
    },
    meta: {
      city: "Los Santos",
      date: new Date().toLocaleDateString("fr-FR"),
    },
    signature: {
      insurerLabel: "Cachet de l'entreprise et signature de l'agent",
      clientLabel: "Précédé de la mention manuscrite \"Lu et approuvé\"",
      insurerImage: TRANSPARENT_IMAGE_DATA_URL,
      clientImage: TRANSPARENT_IMAGE_DATA_URL,
    },
  };
}
