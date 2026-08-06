import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRiskLabel, riskQuestionKeys, type RiskAnswers } from "@/lib/risk";
import { getDefaultSpaceForRole, type AppRole } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const onboardingSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  birthDate: z.string().min(1),
  phone: z.string().min(6).max(40),
  answers: z.object({
    medicalHistoryRisk: z.number().int().min(0).max(3),
    lifestyleRisk: z.number().int().min(0).max(3),
    occupationRisk: z.number().int().min(0).max(3),
    drivingExposure: z.number().int().min(0).max(3),
    homeSecurityRisk: z.number().int().min(0).max(3),
    claimsHistoryRisk: z.number().int().min(0).max(3),
    highValueAssetsRisk: z.number().int().min(0).max(3),
  }),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      birthDate: true,
      phone: true,
      profileCompleted: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
      phone: user.phone ?? "",
      profileCompleted: user.profileCompleted,
      redirectTo: getDefaultSpaceForRole(user.role as AppRole),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.warn("[api/onboarding/profile] tentative non authentifiee");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[api/onboarding/profile] JSON invalide", error);
    return NextResponse.json({ error: "Le corps de la requete est invalide." }, { status: 400 });
  }

  console.info("[api/onboarding/profile] payload recu", {
    userId: session.user.id,
    body,
  });

  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    console.warn("[api/onboarding/profile] echec validation schema", {
      userId: session.user.id,
      fieldErrors: flattened.fieldErrors,
      formErrors: flattened.formErrors,
      issues: parsed.error.issues,
    });

    return NextResponse.json(
      {
        error: "Validation serveur du formulaire echouee.",
        fieldErrors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          code: issue.code,
        })),
      },
      { status: 400 },
    );
  }

  const birthDate = new Date(parsed.data.birthDate);
  if (Number.isNaN(birthDate.getTime())) {
    console.warn("[api/onboarding/profile] date de naissance invalide", {
      userId: session.user.id,
      birthDate: parsed.data.birthDate,
    });
    return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });
  }

  const answers = parsed.data.answers as RiskAnswers;
  const score = riskQuestionKeys.reduce((total, key) => total + answers[key], 0);
  const riskLabel = getRiskLabel(score);

  const fullName = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`;

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        fullName,
        birthDate,
        phone: parsed.data.phone.trim(),
        riskQuestionnaire: answers as Prisma.InputJsonValue,
        riskScore: score,
        riskLabel,
        profileCompleted: true,
      },
      select: {
        role: true,
      },
    });

    console.info("[api/onboarding/profile] profil enregistre", {
      userId: session.user.id,
      riskScore: score,
      riskLabel,
      redirectTo: getDefaultSpaceForRole(user.role as AppRole),
    });

    return NextResponse.json({
      data: {
        profileCompleted: true,
        riskLabel,
        riskScore: score,
        redirectTo: getDefaultSpaceForRole(user.role as AppRole),
      },
    });
  } catch (error) {
    console.error("[api/onboarding/profile] echec persistence", {
      userId: session.user.id,
      error,
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Utilisateur introuvable pour l'enregistrement du profil." }, { status: 404 });
      }

      return NextResponse.json(
        { error: `Erreur base de donnees Prisma (${error.code}).`, details: error.message },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json({ error: "Les donnees envoyees ne correspondent pas au schema Prisma." }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur interne pendant l'enregistrement du profil." }, { status: 500 });
  }
}
