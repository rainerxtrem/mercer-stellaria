import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStorageRoot } from "@/lib/storage-paths";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  // Sanitize to prevent path traversal
  if (!documentId || !/^[A-Z0-9-]+$/.test(documentId)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  try {
    // Try to read HTML file
    const storageRoot = getStorageRoot();
    const htmlPath = path.join(storageRoot, "documents", `${documentId}.html`);

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
        "Content-Disposition": `inline; filename="${documentId}.html"`,
      },
    });
  } catch (error) {
    console.error("Error reading document:", error);
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
