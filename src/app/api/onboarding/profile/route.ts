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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const birthDate = new Date(parsed.data.birthDate);
  if (Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });
  }

  const answers = parsed.data.answers as RiskAnswers;
  const score = riskQuestionKeys.reduce((total, key) => total + answers[key], 0);
  const riskLabel = getRiskLabel(score);

  const fullName = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`;

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

  return NextResponse.json({
    data: {
      profileCompleted: true,
      riskLabel,
      riskScore: score,
      redirectTo: getDefaultSpaceForRole(user.role as AppRole),
    },
  });
}
