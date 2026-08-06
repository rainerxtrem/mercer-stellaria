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

    // Return as PDF with proper headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${contractId}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading contract:", error);
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
}
