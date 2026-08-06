import { writeFile } from "node:fs/promises";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { BASE_DOCUMENT_TEMPLATE_HTML, TRANSPARENT_IMAGE_DATA_URL } from "./document-template-base";
import { renderTemplateContent } from "./document-templates";
import { getStorageRoot } from "./storage-paths";

type ContractPdfInput = {
  contractNumber: string;
  clientName: string;
  formulaName: string;
  weeklyPremium: string;
  effectiveDate: string;
  signatureMethod: string;
  signatureData?: string | null;
};

function parseDataUrl(signatureData: string) {
  const match = signatureData.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mime: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

export async function generateContractPdf(input: ContractPdfInput) {
  const hasClientSignature = Boolean(input.signatureData && parseDataUrl(input.signatureData));

  const renderedHtml = renderTemplateContent(BASE_DOCUMENT_TEMPLATE_HTML, {
    document: {
      type: "Contrat d'assurance",
      reference: input.contractNumber,
      section1: `Le présent contrat couvre la formule ${input.formulaName} pour ${input.clientName}. Date d'effet: ${input.effectiveDate}.`,
      section2: `Prime hebdomadaire: ${input.weeklyPremium} $. Mode de signature: ${input.signatureMethod}.`,
    },
    issuer: {
      department: "Contrats",
      agentName: "Direction Mercer & Stellaria",
    },
    client: {
      fullName: input.clientName,
      entity: "Particulier",
      phone: "N/A",
      dossierNumber: input.contractNumber,
    },
    meta: {
      city: "Los Santos",
      date: input.effectiveDate,
    },
    signature: {
      insurerLabel: "Cachet de l'entreprise et signature de l'agent",
      clientLabel: hasClientSignature
        ? "Signature client validée"
        : "Précédé de la mention manuscrite \"Lu et approuvé\"",
      insurerImage: TRANSPARENT_IMAGE_DATA_URL,
      clientImage: input.signatureData || TRANSPARENT_IMAGE_DATA_URL,
    },
  });

  const outputDirectory = path.join(getStorageRoot(), "contracts");
  await mkdir(outputDirectory, { recursive: true });

  const fileName = `${input.contractNumber}.html`;
  const filePath = path.join(outputDirectory, fileName);

  await writeFile(filePath, renderedHtml, "utf-8");

  return `/storage/contracts/${fileName}`;
}
