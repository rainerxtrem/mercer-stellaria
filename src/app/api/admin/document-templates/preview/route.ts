import { SignatureMethod } from "@/generated/prisma/enums";
import { buildNumber } from "@/lib/ids";
import { buildHtmlPreviewDocument, isHtmlTemplate, renderTemplateContent } from "@/lib/document-templates";
import { generateHtmlToPdf } from "@/lib/html-to-pdf";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const previewSchema = z
  .object({
    mode: z.enum(["TEMPLATE_CREATE", "DOCUMENT_GENERATE"]),
    title: z.string().min(3).max(160),
    templateId: z.string().uuid().optional(),
    content: z.string().min(10).optional(),
    payload: z.record(z.string(), z.unknown()).default({}),
    signatureMethod: z.enum([SignatureMethod.CERTIFIED_CLICK, SignatureMethod.DRAWN_CANVAS]).optional(),
    signatureData: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (data.mode === "DOCUMENT_GENERATE" && !data.templateId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["templateId"], message: "templateId requis." });
    }

    if (data.mode === "TEMPLATE_CREATE" && !data.content) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["content"], message: "content requis." });
    }

    if (data.signatureMethod === SignatureMethod.DRAWN_CANVAS && !data.signatureData) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["signatureData"], message: "Signature dessinée requise." });
    }
  });

export async function POST(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let templateContent = parsed.data.content ?? "";

  if (parsed.data.mode === "DOCUMENT_GENERATE") {
    const template = await prisma.documentTemplate.findUnique({
      where: { id: parsed.data.templateId },
      select: { id: true, content: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
    }

    templateContent = template.content;
  }

  const rendered = renderTemplateContent(templateContent, parsed.data.payload);
  const previewNumber = buildNumber("PREVIEW");
  const previewTitle = `${parsed.data.title} (prévisualisation)`;

  try {
    let previewUrl = "";

    if (isHtmlTemplate(rendered)) {
      const htmlContent = buildHtmlPreviewDocument(rendered, previewTitle);
      previewUrl = await generateHtmlToPdf({
        htmlContent,
        documentNumber: previewNumber,
        outputBucket: "previews",
        outputFileName: `${previewNumber}.pdf`,
      });
    } else {
      const { generateTemplatePdf } = await import("@/lib/document-templates");
      previewUrl = await generateTemplatePdf({
        documentNumber: previewNumber,
        title: previewTitle,
        content: rendered,
        signatureMethod: parsed.data.signatureMethod,
        signatureData: parsed.data.signatureData,
        outputBucket: "previews",
        outputFileName: `${previewNumber}.pdf`,
      });
    }

    return NextResponse.json({ data: { previewUrl, renderedContent: rendered, previewKind: "PDF" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prévisualisation impossible.";
    console.error("Preview generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
