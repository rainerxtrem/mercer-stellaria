import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStorageRoot } from "@/lib/storage-paths";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

function sanitizeSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function resolveExtension(fileName: string, mimeType: string) {
  const raw = path.extname(fileName || "").replace(".", "").toLowerCase();
  if (raw) {
    return raw;
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "txt";
}

export async function storeUploadedFile(file: File, scope: "claims" | "contact" | "documents") {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Type de fichier non autorisé. Formats acceptés: PDF, PNG, JPG, WEBP, TXT.");
  }

  if (file.size <= 0) {
    throw new Error("Le fichier est vide.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Le fichier dépasse la limite de 10 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeBaseName = sanitizeSegment(path.basename(file.name, path.extname(file.name))) || "piece";
  const extension = resolveExtension(file.name, file.type);
  const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBaseName}.${extension}`;

  const targetDirectory = path.join(getStorageRoot(), "uploads", scope);
  await mkdir(targetDirectory, { recursive: true });

  const absolutePath = path.join(targetDirectory, finalName);
  await writeFile(absolutePath, buffer);

  return {
    fileName: finalName,
    publicUrl: `/storage/uploads/${scope}/${finalName}`,
    size: file.size,
    mimeType: file.type,
  };
}
