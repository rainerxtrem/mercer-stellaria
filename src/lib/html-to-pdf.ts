import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStorageRoot } from "@/lib/storage-paths";

// Embed public assets as base64 so Puppeteer can render them without a running server
async function inlinePublicImages(html: string): Promise<string> {
  const publicDir = path.join(process.cwd(), "public");
  const matches = [...html.matchAll(/src="\/([^"]+\.(png|jpg|jpeg|gif|svg|webp))"/gi)];
  let result = html;
  for (const [full, filename] of matches) {
    try {
      const buf = await readFile(path.join(publicDir, filename));
      const ext = filename.split(".").pop()!.toLowerCase();
      const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      result = result.replace(full, `src="data:${mime};base64,${buf.toString("base64")}"`);
    } catch {
      // skip missing files
    }
  }
  return result;
}

export async function generateHtmlToPdf(input: {
  htmlContent: string;
  documentNumber: string;
  outputBucket: "documents" | "previews" | "contracts";
  outputFileName?: string;
}): Promise<string> {
  const htmlWithInlinedImages = await inlinePublicImages(input.htmlContent);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlWithInlinedImages, { waitUntil: "load" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    const outputDirectory = path.join(getStorageRoot(), input.outputBucket);
    await mkdir(outputDirectory, { recursive: true });

    const fileName = input.outputFileName ?? `${input.documentNumber}.pdf`;
    const filePath = path.join(outputDirectory, fileName);
    await writeFile(filePath, pdfBuffer);

    return `/storage/${input.outputBucket}/${fileName}`;
  } finally {
    await browser.close();
  }
}
