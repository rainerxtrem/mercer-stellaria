export const riskQuestionKeys = [
  "medicalHistoryRisk",
  "lifestyleRisk",
  "occupationRisk",
  "drivingExposure",
  "homeSecurityRisk",
  "claimsHistoryRisk",
  "highValueAssetsRisk",
] as const;

export type RiskQuestionKey = (typeof riskQuestionKeys)[number];

export type RiskAnswers = Record<RiskQuestionKey, number>;

export function computeRiskScore(answers: RiskAnswers) {
  return riskQuestionKeys.reduce((total, key) => total + answers[key], 0);
}

export function getRiskLabel(score: number) {
  if (score <= 5) {
    return "Risque faible";
  }

  if (score <= 10) {
    return "Risque modere";
  }

  if (score <= 15) {
    return "Risque eleve";
  }

  return "Risque critique";
}
