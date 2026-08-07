#!/usr/bin/env node
/**
 * Déploiement de schéma sans perte de données.
 *
 * La base de production a été créée avec `prisma db push`, elle n'a donc pas
 * forcément d'historique de migrations. Ce script la « baseline » (marque les
 * migrations déjà reflétées comme appliquées) avant de lancer `migrate deploy`,
 * ce qui remplace `db push --accept-data-loss` sans jamais supprimer de données.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function run(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("npx", ["prisma", ...args], { stdio: "pipe", encoding: "utf8", shell: true });
  } catch (error) {
    if (allowFailure) {
      return error.stdout ?? "";
    }
    process.stderr.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    throw error;
  }
}

function listMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function needsBaseline() {
  const status = run(["migrate", "status"], { allowFailure: true });

  // Schéma déjà présent mais historique absent/incomplet => baseline requis.
  return (
    status.includes("have not yet been applied") &&
    (status.includes("drift") || status.includes("baseline") || status.includes("P3005"))
  );
}

const migrations = listMigrations();

if (migrations.length === 0) {
  console.log("[db-deploy] Aucune migration à appliquer.");
  process.exit(0);
}

if (needsBaseline()) {
  console.log("[db-deploy] Base existante détectée sans historique complet : baseline en cours.");
  for (const migration of migrations) {
    run(["migrate", "resolve", "--applied", migration], { allowFailure: true });
    console.log(`[db-deploy]   marquée appliquée : ${migration}`);
  }
}

console.log("[db-deploy] prisma migrate deploy");
process.stdout.write(run(["migrate", "deploy"]));
console.log("[db-deploy] Schéma à jour.");
