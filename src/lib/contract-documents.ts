import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Mercer & Stellaria Insurance", {
    x: 50,
    y: 790,
    size: 22,
    font: fontBold,
    color: rgb(0.06, 0.13, 0.26),
  });

  page.drawText(`Contrat: ${input.contractNumber}`, { x: 50, y: 750, size: 12, font });
  page.drawText(`Client: ${input.clientName}`, { x: 50, y: 730, size: 12, font });
  page.drawText(`Formule: ${input.formulaName}`, { x: 50, y: 710, size: 12, font });
  page.drawText(`Prime hebdomadaire: ${input.weeklyPremium} $`, { x: 50, y: 690, size: 12, font });
  page.drawText(`Date d'effet: ${input.effectiveDate}`, { x: 50, y: 670, size: 12, font });
  page.drawText(`Methode signature: ${input.signatureMethod}`, { x: 50, y: 650, size: 12, font });

  if (input.signatureData) {
    const parsed = parseDataUrl(input.signatureData);
    if (parsed) {
      const image = parsed.mime === "png" ? await pdfDoc.embedPng(parsed.bytes) : await pdfDoc.embedJpg(parsed.bytes);
      page.drawText("Signature client", { x: 50, y: 610, size: 11, font });
      page.drawImage(image, { x: 50, y: 500, width: 200, height: 90 });
    }
  }

  const outputDirectory = path.join(process.cwd(), "public", "storage", "contracts");
  await mkdir(outputDirectory, { recursive: true });

  const fileName = `${input.contractNumber}.pdf`;
  const filePath = path.join(outputDirectory, fileName);
  const pdfBytes = await pdfDoc.save();

  await writeFile(filePath, pdfBytes);

  return `/storage/contracts/${fileName}`;
}
