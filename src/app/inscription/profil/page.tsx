"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

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

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
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
    return Boolean(form.firstName && form.lastName && form.birthDate && form.phone);
  }, [form.firstName, form.lastName, form.birthDate, form.phone]);

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!session?.user) {
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
        }));
      })
      .catch(() => setStatus("Impossible de charger votre dossier."))
      .finally(() => setLoading(false));
  }, [session, sessionStatus, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setStatus("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setSubmitting(true);
    setStatus("Enregistrement du profil et evaluation du risque...");

    const response = await fetch("/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setSubmitting(false);
      setStatus("Echec de validation du formulaire.");
      return;
    }

    const payload = await response.json();
    const redirectTo = payload?.data?.redirectTo;

    if (typeof redirectTo === "string") {
      router.replace(redirectTo);
      return;
    }

    router.replace("/client");
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
