"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole } from "@/lib/rbac";

type Question = {
  key:
    | "medicalHistoryRisk"
    | "lifestyleRisk"
    | "occupationRisk"
    | "drivingExposure"
    | "homeSecurityRisk"
    | "claimsHistoryRisk"
    | "highValueAssetsRisk";
  label: string;
};

const questions: Question[] = [
  { key: "medicalHistoryRisk", label: "Avez-vous des antecedents medicaux lourds ?" },
  { key: "lifestyleRisk", label: "Votre mode de vie expose-t-il a des risques frequents ?" },
  { key: "occupationRisk", label: "Votre activite professionnelle est-elle a risque ?" },
  { key: "drivingExposure", label: "Conduisez-vous intensivement en zone urbaine sensible ?" },
  { key: "homeSecurityRisk", label: "Votre domicile ou local est-il faiblement securise ?" },
  { key: "claimsHistoryRisk", label: "Avez-vous eu plusieurs sinistres recents ?" },
  { key: "highValueAssetsRisk", label: "Detenez-vous des biens de forte valeur tres exposes ?" },
];

const riskOptions = [
  { value: 0, label: "Niveau 0 - Tres faible" },
  { value: 1, label: "Niveau 1 - Faible" },
  { value: 2, label: "Niveau 2 - Moyen" },
  { value: 3, label: "Niveau 3 - Eleve" },
];

const fieldLabels: Record<string, string> = {
  firstName: "Prenom",
  lastName: "Nom",
  birthDate: "Date de naissance",
  phone: "Numero de telephone",
  citizenUniqueId: "ID Citoyen Unique",
  medicalHistoryRisk: "Question 1 - antecedents medicaux",
  lifestyleRisk: "Question 2 - mode de vie",
  occupationRisk: "Question 3 - activite professionnelle",
  drivingExposure: "Question 4 - conduite",
  homeSecurityRisk: "Question 5 - securite du domicile",
  claimsHistoryRisk: "Question 6 - historique de sinistres",
  highValueAssetsRisk: "Question 7 - biens de valeur",
};

function getFieldLabel(field: string) {
  return fieldLabels[field] ?? field;
}

function getLocalValidationError(form: {
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  citizenUniqueId: string;
  answers: Record<string, number>;
}) {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const phone = form.phone.trim();
  const citizenUniqueId = form.citizenUniqueId.trim();

  if (firstName.length < 2) {
    return "Le champ Prenom doit contenir au moins 2 caracteres.";
  }

  if (lastName.length < 2) {
    return "Le champ Nom doit contenir au moins 2 caracteres.";
  }

  if (!form.birthDate) {
    return "Le champ Date de naissance est obligatoire.";
  }

  if (Number.isNaN(new Date(form.birthDate).getTime())) {
    return "La date de naissance est invalide.";
  }

  if (phone.length < 6) {
    return "Le champ Numero de telephone doit contenir au moins 6 caracteres.";
  }

  if (phone.length > 40) {
    return "Le champ Numero de telephone ne peut pas depasser 40 caracteres.";
  }

  if (citizenUniqueId.length < 3) {
    return "Le champ ID Citoyen Unique doit contenir au moins 3 caracteres.";
  }

  for (const [key, value] of Object.entries(form.answers)) {
    if (!Number.isInteger(value) || value < 0 || value > 3) {
      return `${getFieldLabel(key)} est invalide.`;
    }
  }

  return null;
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    if ("error" in payload && typeof payload.error === "string") {
      return payload.error;
    }

    if ("fieldErrors" in payload && payload.fieldErrors && typeof payload.fieldErrors === "object") {
      for (const [field, messages] of Object.entries(payload.fieldErrors as Record<string, unknown>)) {
        if (Array.isArray(messages) && typeof messages[0] === "string") {
          return `${getFieldLabel(field)}: ${messages[0]}`;
        }
      }
    }

    if ("issues" in payload && Array.isArray(payload.issues)) {
      for (const issue of payload.issues as Array<{ path?: unknown; message?: unknown }>) {
        if (typeof issue?.message === "string") {
          const field = Array.isArray(issue.path) && typeof issue.path.at(-1) === "string" ? issue.path.at(-1) : null;
          return field ? `${getFieldLabel(field)}: ${issue.message}` : issue.message;
        }
      }
    }
  }

  return fallback;
}

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus, update } = useSession();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    citizenUniqueId: "",
    answers: {
      medicalHistoryRisk: 0,
      lifestyleRisk: 0,
      occupationRisk: 0,
      drivingExposure: 0,
      homeSecurityRisk: 0,
      claimsHistoryRisk: 0,
      highValueAssetsRisk: 0,
    },
  });

  const canSubmit = useMemo(() => {
    return getLocalValidationError(form) === null;
  }, [form]);

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!session?.user) {
      return;
    }

    const currentRole = ((session.user.role as AppRole | undefined) ?? "PUBLIC");
    if (currentRole !== "CLIENT") {
      router.replace(getDefaultSpaceForRole(currentRole));
      return;
    }

    fetch("/api/onboarding/profile")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Erreur de recuperation");
        }

        const payload = await response.json();
        const data = payload?.data;

        if (data?.profileCompleted && typeof data?.redirectTo === "string") {
          router.replace(data.redirectTo);
          return;
        }

        setForm((prev) => ({
          ...prev,
          firstName: data?.firstName ?? "",
          lastName: data?.lastName ?? "",
          birthDate: data?.birthDate ?? "",
          phone: data?.phone ?? "",
          citizenUniqueId: data?.citizenUniqueId ?? "",
        }));
      })
      .catch(() => setStatus("Impossible de charger votre dossier."))
      .finally(() => setLoading(false));
  }, [session, sessionStatus, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getLocalValidationError(form);

    if (validationError) {
      console.warn("[onboarding/profile] validation bloquee cote client", { validationError, form });
      setStatus(validationError);
      return;
    }

    const submissionPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      birthDate: form.birthDate,
      phone: form.phone.trim(),
      citizenUniqueId: form.citizenUniqueId.trim(),
      answers: form.answers,
    };

    setSubmitting(true);
    setStatus("Enregistrement du profil et evaluation du risque...");

    try {
      console.info("[onboarding/profile] requete envoyee", submissionPayload);

      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayload),
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      console.info("[onboarding/profile] reponse API", {
        status: response.status,
        ok: response.ok,
        payload,
      });

      if (!response.ok) {
        const apiError = getApiErrorMessage(payload, `Echec de validation du formulaire (HTTP ${response.status}).`);

        setStatus(apiError);
        return;
      }

      const redirectTo =
        payload &&
        typeof payload === "object" &&
        "data" in payload &&
        payload.data &&
        typeof payload.data === "object" &&
        "redirectTo" in payload.data &&
        typeof payload.data.redirectTo === "string"
          ? payload.data.redirectTo
          : null;

      if (redirectTo) {
        setStatus("Profil enregistre avec succes.");
        await update();
        router.replace(redirectTo);
        return;
      }

      setStatus("Profil enregistre avec succes.");
      await update();
      router.replace("/client");
    } catch (error) {
      console.error("[onboarding/profile] erreur reseau", error);
      setStatus("Erreur reseau pendant la validation. Reessayez dans quelques secondes.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDiscordSignIn() {
    setStatus("Redirection vers Discord...");
    await signIn("discord", { callbackUrl: "/inscription/profil" });
  }

  if (sessionStatus === "loading" || (session?.user && loading)) {
    return (
      <main className="brand-shell flex flex-1 items-center justify-center px-6 py-12">
        <div className="surface w-full max-w-2xl p-8">
          <p className="text-sm text-ms-navy">Chargement du formulaire...</p>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="brand-shell flex flex-1 items-center justify-center px-6 py-12">
        <div className="surface w-full max-w-2xl p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-ms-navy-soft">Acces securise</p>
          <h1 className="mt-3 text-4xl font-semibold text-ms-navy">Finaliser votre inscription</h1>
          <p className="mt-2 text-sm text-ms-ink/70">Connectez-vous avec Discord pour completer le formulaire assure.</p>
          <button
            type="button"
            onClick={handleDiscordSignIn}
            className="mt-7 w-full rounded-full bg-ms-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-ms-navy-soft"
          >
            Continuer avec Discord
          </button>
          <p className="mt-5 text-sm text-ms-ink/70">
            Vous avez deja un compte ?{" "}
            <Link href="/connexion" className="font-semibold text-ms-navy underline decoration-ms-gold/70 underline-offset-4">
              Se connecter
            </Link>
          </p>
          {status ? <p className="mt-4 text-sm text-ms-navy">{status}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="brand-shell flex flex-1 justify-center px-6 py-10">
      <div className="surface w-full max-w-4xl p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-ms-navy-soft">Onboarding assure</p>
        <h1 className="mt-3 text-4xl font-semibold text-ms-navy">Profil & evaluation de risque</h1>
        <p className="mt-2 text-sm text-ms-ink/70">
          Renseignez vos informations. L&apos;etiquette de risque calculee sera visible uniquement par les collaborateurs.
        </p>

        <form className="mt-7 grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-ms-ink/85">
              Prenom
              <input
                required
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm text-ms-ink/85">
              Nom
              <input
                required
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm text-ms-ink/85">
              Date de naissance
              <input
                required
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm text-ms-ink/85">
              Numero de telephone
              <input
                required
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
            </label>
            <label className="grid gap-1 text-sm text-ms-ink/85">
              ID Citoyen Unique
              <input
                required
                value={form.citizenUniqueId}
                onChange={(event) => setForm((prev) => ({ ...prev, citizenUniqueId: event.target.value }))}
                className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
              />
            </label>
          </div>

          <section className="grid gap-4 rounded-2xl border border-ms-navy/10 bg-white p-5">
            <h2 className="text-2xl font-semibold text-ms-navy">Questionnaire de risque (7 questions)</h2>
            {questions.map((question, index) => (
              <label key={question.key} className="grid gap-1 text-sm text-ms-ink/85">
                {index + 1}. {question.label}
                <select
                  value={form.answers[question.key]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      answers: {
                        ...prev.answers,
                        [question.key]: Number(event.target.value),
                      },
                    }))
                  }
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                >
                  {riskOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-ms-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-ms-navy-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Validation en cours..." : "Valider mon dossier"}
          </button>
        </form>

        {status ? <p className="mt-4 text-sm text-ms-navy">{status}</p> : null}
      </div>
    </main>
  );
}
