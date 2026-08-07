"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole, getServiceSpaceForRole } from "@/lib/rbac";

type ConnexionService = "assurance" | "investment" | "law_firm" | "default";

function resolveConnexionService(value: string | null): ConnexionService {
  if (value === "assurance" || value === "assure") {
    return "assurance";
  }

  if (value === "investment") {
    return "investment";
  }

  if (value === "cabinet" || value === "law_firm" || value === "lawfirm") {
    return "law_firm" as ConnexionService;
  }

  return "default";
}

export default function ConnexionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [status, setStatus] = useState<string>("");
  const [queryState] = useState(() => {
    if (typeof window === "undefined") {
      return { oauthError: null as string | null, requestedService: "default" as ConnexionService };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      oauthError: params.get("error"),
      requestedService: resolveConnexionService(params.get("service") ?? params.get("space")),
    };
  });
  const { oauthError, requestedService } = queryState;

  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const identity = useMemo(() => {
    const firstName = session?.user?.firstName?.trim();
    const lastName = session?.user?.lastName?.trim();
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    return session?.user?.name ?? "Utilisateur";
  }, [session?.user?.firstName, session?.user?.lastName, session?.user?.name]);

  async function handleDiscordSignIn() {
    setStatus("Redirection vers Discord...");
    const callbackUrl = requestedService === "default"
      ? "/connexion"
      : `/connexion?service=${requestedService}`;

    await signIn("discord", { callbackUrl });
  }

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    if (!session.user.profileCompleted && role !== "PUBLIC") {
      router.replace("/inscription/profil");
      return;
    }

    if (role !== "PUBLIC") {
      const target = requestedService === "default"
        ? getDefaultSpaceForRole(role)
        : getServiceSpaceForRole(role, requestedService);
      router.replace(target);
    }
  }, [session?.user, role, requestedService, router]);

  const redirectLabel = requestedService === "investment"
    ? "votre espace investisseur"
    : requestedService === "law_firm"
      ? "votre espace Law Firm"
      : "votre espace assuré";

  return (
    <main className="brand-shell flex flex-1 items-center justify-center px-6 py-12">
      <div className="surface w-full max-w-md p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-ms-navy-soft">Portail sécurisé</p>
        <h1 className="mt-3 font-display text-4xl text-ms-navy">Connexion</h1>
        <p className="mt-2 text-sm text-ms-ink/70">Accédez à votre espace client, collaborateur ou direction.</p>

        {!session?.user ? (
          <button
            type="button"
            onClick={handleDiscordSignIn}
            className="mt-7 w-full rounded-full bg-ms-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-ms-navy-soft"
          >
            Se connecter avec Discord
          </button>
        ) : (
          <div className="mt-7 grid gap-3">
            <p className="text-sm text-ms-ink/80">Connecté en tant que {identity}</p>
            <p className="text-sm text-ms-ink/70">Redirection en cours vers {redirectLabel}...</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-ms-navy/20 px-4 py-2 text-sm font-semibold text-ms-navy"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        )}

        {status ? <p className="mt-4 text-sm text-ms-navy">{status}</p> : null}
        {oauthError ? (
          <p className="mt-3 text-sm text-red-700">
            Échec de connexion Discord: {oauthError}. Vérifiez les scopes OAuth, la Redirect URL et que votre compte Discord partage son email.
          </p>
        ) : null}

        <p className="mt-5 text-sm text-ms-ink/70">
          Nouveau chez Mercer & Stellaria ?{" "}
          <Link href="/inscription" className="font-semibold text-ms-navy underline decoration-ms-gold/70 underline-offset-4">
            Créer un compte client
          </Link>
        </p>
      </div>
    </main>
  );
}
