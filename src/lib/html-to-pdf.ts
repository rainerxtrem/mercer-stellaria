import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStorageRoot } from "@/lib/storage-paths";

export async function generateHtmlToPdf(input: {
  htmlContent: string;
  documentNumber: string;
  outputBucket: "documents" | "previews" | "contracts";
  outputFileName?: string;
}): Promise<string> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(input.htmlContent, { waitUntil: "load" });

    // Ensure background colors/images are included
    await page.emulateMediaType("print");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });

    const outputBucket = input.outputBucket;
    const outputDirectory = path.join(getStorageRoot(), outputBucket);
    await mkdir(outputDirectory, { recursive: true });

    const fileName = input.outputFileName ?? `${input.documentNumber}.pdf`;
    const filePath = path.join(outputDirectory, fileName);
    await writeFile(filePath, pdfBuffer);

    return `/storage/${outputBucket}/${fileName}`;
  } finally {
    await browser.close();
  }
}
