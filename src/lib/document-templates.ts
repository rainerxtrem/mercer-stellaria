import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type TemplatePayload = Record<string, unknown>;

function getValueByPath(payload: TemplatePayload, rawPath: string) {
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

export function renderTemplateContent(content: string, payload: TemplatePayload) {
  return content.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, token: string) => getValueByPath(payload, token));
}

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

function drawWrappedText(args: {
  page: import("pdf-lib").PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  font: import("pdf-lib").PDFFont;
  size: number;
}) {
  const { page, text, x, y, maxWidth, lineHeight, font, size } = args;
  const paragraphs = text.split(/\n\n+/g);
  let cursorY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    for (const word of words) {
      const nextLine = line ? `${line} ${word}` : word;
      const nextWidth = font.widthOfTextAtSize(nextLine, size);

      if (nextWidth > maxWidth && line) {
        page.drawText(line, { x, y: cursorY, size, font, color: rgb(0.11, 0.16, 0.24) });
        cursorY -= lineHeight;
        line = word;
      } else {
        line = nextLine;
      }
    }

    if (line) {
      page.drawText(line, { x, y: cursorY, size, font, color: rgb(0.11, 0.16, 0.24) });
      cursorY -= lineHeight;
    }

    cursorY -= lineHeight * 0.6;
  }

  return cursorY;
}

export async function generateTemplatePdf(input: {
  documentNumber: string;
  title: string;
  content: string;
  signatureMethod?: "DRAWN_CANVAS" | "CERTIFIED_CLICK";
  signatureData?: string | null;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Mercer & Stellaria Insurance", {
    x: 50,
    y: 795,
    size: 20,
    font: bold,
    color: rgb(0.06, 0.13, 0.26),
  });

  page.drawText(input.title, {
    x: 50,
    y: 765,
    size: 14,
    font: bold,
    color: rgb(0.07, 0.14, 0.3),
  });

  page.drawText(`Document: ${input.documentNumber}`, { x: 50, y: 744, size: 10, font, color: rgb(0.3, 0.36, 0.45) });
  page.drawText(`Date: ${new Date().toLocaleDateString("fr-FR")}`, { x: 420, y: 744, size: 10, font, color: rgb(0.3, 0.36, 0.45) });

  const contentBottom = drawWrappedText({
    page,
    text: input.content,
    x: 50,
    y: 710,
    maxWidth: 495,
    lineHeight: 17,
    font,
    size: 11,
  });

  const signatureBlockY = Math.max(110, contentBottom - 30);

  page.drawText("Signature", {
    x: 50,
    y: signatureBlockY,
    size: 11,
    font: bold,
    color: rgb(0.12, 0.17, 0.25),
  });

  if (input.signatureMethod === "CERTIFIED_CLICK") {
    page.drawText("Signature certifiée par clic validée.", {
      x: 50,
      y: signatureBlockY - 18,
      size: 10,
      font,
      color: rgb(0.2, 0.3, 0.18),
    });
  }

  if (input.signatureMethod === "DRAWN_CANVAS" && input.signatureData) {
    const parsed = parseDataUrl(input.signatureData);
    if (parsed) {
      const image = parsed.mime === "png" ? await pdfDoc.embedPng(parsed.bytes) : await pdfDoc.embedJpg(parsed.bytes);
      page.drawImage(image, { x: 50, y: signatureBlockY - 80, width: 220, height: 70 });
    }
  }

  const outputDirectory = path.join(process.cwd(), "public", "storage", "documents");
  await mkdir(outputDirectory, { recursive: true });

  const fileName = `${input.documentNumber}.pdf`;
  const filePath = path.join(outputDirectory, fileName);

  await writeFile(filePath, await pdfDoc.save());

  return `/storage/documents/${fileName}`;
}
