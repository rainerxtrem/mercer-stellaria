"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { AppRole } from "@/lib/rbac";

export default function ConnexionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [status, setStatus] = useState<string>("");
  const [oauthError] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(window.location.search).get("error");
  });

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
    await signIn("discord", { callbackUrl: "/client" });
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
      router.replace("/client");
    }
  }, [session?.user, role, router]);

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
            <p className="text-sm text-ms-ink/70">Redirection en cours vers votre espace client...</p>
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
