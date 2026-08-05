import { writeAuditLogSafe } from "@/lib/audit-log";
import { storeUploadedFile } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const scopeSchema = z.enum(["claims", "contact", "documents"]);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "PUBLIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const scopeRaw = formData.get("scope");
  const fileRaw = formData.get("file");

  const scopeResult = scopeSchema.safeParse(scopeRaw);
  if (!scopeResult.success) {
    return NextResponse.json({ error: "Scope upload invalide." }, { status: 400 });
  }

  if (!(fileRaw instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier transmis." }, { status: 400 });
  }

  try {
    const uploaded = await storeUploadedFile(fileRaw, scopeResult.data);

    await writeAuditLogSafe({
      actorId: user.id,
      actorRole: user.role,
      action: "FILE_UPLOADED",
      entityType: "Upload",
      entityId: uploaded.fileName,
      summary: `Upload ${uploaded.fileName} (${scopeResult.data})`,
      details: {
        mimeType: uploaded.mimeType,
        size: uploaded.size,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ data: uploaded }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload impossible." },
      { status: 400 },
    );
  }
}
