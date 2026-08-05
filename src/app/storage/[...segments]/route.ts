import { getStorageRoot } from "@/lib/storage-paths";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const allowedBuckets = new Set(["contracts", "documents", "uploads"]);

function detectContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".txt") {
    return "text/plain; charset=utf-8";
  }

  return "application/octet-stream";
}

function isSafeSegment(segment: string) {
  if (!segment || segment === "." || segment === "..") {
    return false;
  }

  return !segment.includes("/") && !segment.includes("\\");
}

export async function GET(_request: Request, context: { params: Promise<{ segments: string[] }> }) {
  const params = await context.params;
  const segments = Array.isArray(params.segments) ? params.segments.map((segment) => decodeURIComponent(segment)) : [];

  if (segments.length < 2 || segments.some((segment) => !isSafeSegment(segment))) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const bucket = segments[0];
  if (!allowedBuckets.has(bucket)) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  if (bucket === "uploads" && segments.length < 3) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const storageRoot = getStorageRoot();
  const bucketRoot = path.join(storageRoot, bucket);
  const absolutePath = path.join(storageRoot, ...segments);

  if (!absolutePath.startsWith(bucketRoot)) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  }

  try {
    const buffer = await readFile(absolutePath);
    const headers = new Headers();
    headers.set("Content-Type", detectContentType(absolutePath));
    headers.set("Content-Disposition", `inline; filename="${path.basename(absolutePath)}"`);
    return new NextResponse(buffer, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
