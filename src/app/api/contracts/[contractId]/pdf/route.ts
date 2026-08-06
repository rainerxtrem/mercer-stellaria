import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStorageRoot } from "@/lib/storage-paths";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params;

  // Sanitize to prevent path traversal
  if (!contractId || !/^[A-Z0-9-]+$/.test(contractId)) {
    return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
  }

  try {
    // Try to read HTML file
    const storageRoot = getStorageRoot();
    const htmlPath = path.join(storageRoot, "contracts", `${contractId}.html`);

    const content = await readFile(htmlPath, "utf-8");

    // Inject print script into HTML
    const htmlWithPrint = content.replace(
      "</head>",
      `<script>window.addEventListener('load', () => { setTimeout(() => window.print(), 500); });</script></head>`
    );

    // Return as HTML that triggers print dialog
    return new NextResponse(htmlWithPrint, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${contractId}.html"`,
      },
    });
  } catch (error) {
    console.error("Error reading contract:", error);
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
}
