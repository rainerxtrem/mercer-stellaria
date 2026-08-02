"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { AppRole, getDefaultSpaceForRole } from "@/lib/rbac";

export default function InscriptionPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string>("");

  const role = ((session?.user?.role as AppRole | undefined) ?? "PUBLIC");
  const roleTarget = getDefaultSpaceForRole(role);
  const identity = useMemo(() => {
    const firstName = session?.user?.firstName?.trim();
    const lastName = session?.user?.lastName?.trim();

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    return session?.user?.name ?? "Assuré connecté";
  }, [session?.user?.firstName, session?.user?.lastName, session?.user?.name]);

  async function handleDiscordSignup() {
    setStatus("Redirection vers Discord pour créer votre compte...");
    await signIn("discord", { callbackUrl: "/inscription/profil" });
  }

  return (
    <main className="brand-shell flex flex-1 items-center justify-center px-6 py-12">
      <div className="surface w-full max-w-2xl p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-ms-navy-soft">Espace public</p>
        <h1 className="mt-3 font-display text-4xl text-ms-navy">Inscription Client</h1>
        <p className="mt-2 text-sm text-ms-ink/70">Création de compte sécurisé via Discord (OAuth).</p>

        {!session?.user ? (
          <button
            type="button"
            onClick={handleDiscordSignup}
            className="mt-7 w-full rounded-full bg-ms-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-ms-navy-soft"
          >
            Continuer avec Discord
          </button>
        ) : (
          <div className="mt-7 grid gap-3">
            <p className="text-sm text-ms-ink/80">Connecté en tant que {identity}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={session.user.profileCompleted ? roleTarget : "/inscription/profil"}
                className="rounded-full bg-ms-navy px-4 py-2 text-sm font-semibold text-white"
              >
                {session.user.profileCompleted ? "Accéder à mon espace" : "Finaliser mon profil"}
              </Link>
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

        <p className="mt-5 text-sm text-ms-ink/70">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-semibold text-ms-navy underline decoration-ms-gold/70 underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
