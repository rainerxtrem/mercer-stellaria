import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStorageRoot } from "@/lib/storage-paths";

function transformPublicUrls(htmlContent: string): string {
  const projectRoot = /*turbopackIgnore: true*/ process.cwd();
  return htmlContent.replace(/src="\/([^"]+)"/g, (match, filename) => {
    const filePath = /*turbopackIgnore: true*/ path.resolve(projectRoot, "public", filename);
    return `src="file://${filePath}"`;
  });
}

export async function generateHtmlToPdf(input: {
  htmlContent: string;
  documentNumber: string;
  outputBucket?: "documents" | "previews" | "contracts";
  outputFileName?: string;
}) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    const transformedHtml = transformPublicUrls(input.htmlContent);
    await page.setContent(transformedHtml, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "45mm",
        right: "20mm",
        bottom: "35mm",
        left: "20mm",
      },
      printBackground: true,
      preferCSSPageSize: true,
    });

    const outputBucket = input.outputBucket ?? "documents";
    const outputDirectory = /*turbopackIgnore: true*/ path.join(getStorageRoot(), outputBucket);
    await mkdir(outputDirectory, { recursive: true });

    const fileName = input.outputFileName ?? `${input.documentNumber}.pdf`;
    const filePath = /*turbopackIgnore: true*/ path.join(outputDirectory, fileName);

    await writeFile(filePath, pdfBuffer);

    return `/storage/${outputBucket}/${fileName}`;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
